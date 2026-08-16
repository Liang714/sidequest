"""Bookings + commission tracking (Phase 7 foundation) — uses the real
FakeBookingProvider and FakeProvider payment default (both "fake" is the
dev/test default, see app/bookings/service.py and app/payments/service.py),
not dependency overrides, since "fake" already behaves like a test double."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

import app.db as db_module
from app.models.commerce import Payment, PaymentType
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio

TOMORROW = (datetime.now(UTC).date() + timedelta(days=1)).isoformat()


async def _get_a_slot(client, tokens):
    resp = await client.get(
        "/bookings/availability",
        params={"activity_key": "bowling", "on_date": TOMORROW, "party_size": 4},
        headers=auth_headers(tokens),
    )
    assert resp.status_code == 200, resp.text
    slots = resp.json()
    assert len(slots) == 4
    return slots[0]


async def test_availability_returns_slots_with_correct_capacity(client, seed_reference_data):
    user = await register(client, email="book1@example.com", username="book1")
    slot = await _get_a_slot(client, user)
    assert slot["capacity"] >= 4
    assert Decimal(slot["price_amount"]) > 0
    assert slot["currency"] == "KRW"


async def test_booking_charges_and_records_correct_commission(client, seed_reference_data):
    user = await register(client, email="book2@example.com", username="book2")
    slot = await _get_a_slot(client, user)

    resp = await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": slot["slot_ref"], "party_size": 4},
        headers=auth_headers(user),
    )
    assert resp.status_code == 201, resp.text
    booking = resp.json()
    assert booking["status"] == "confirmed"
    assert booking["provider"] == "fake"
    assert Decimal(booking["amount"]) == Decimal(slot["price_amount"])
    expected_commission = (Decimal(slot["price_amount"]) * Decimal(15) / 100).quantize(Decimal("0.01"))
    assert Decimal(booking["commission_amount"]) == expected_commission


async def test_booking_can_be_tied_to_a_quest_or_stand_alone(client, seed_reference_data):
    user = await register(client, email="book3@example.com", username="book3")

    quest = await client.post(
        "/quests",
        json={
            "title": "Bowling Night",
            "description": "Book a lane.",
            "category_key": "category.photography",
            "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
            "start_time": "2026-09-20T19:00:00+00:00",
            "duration_minutes": 90,
            "max_participants": 4,
            "difficulty": "easy",
            "xp_reward": 150,
            "objectives": [],
        },
        headers=auth_headers(user),
    )
    quest_id = quest.json()["id"]

    slot = await _get_a_slot(client, user)
    with_quest = await client.post(
        "/bookings",
        json={"quest_id": quest_id, "activity_key": "bowling", "slot_ref": slot["slot_ref"], "party_size": 4},
        headers=auth_headers(user),
    )
    assert with_quest.status_code == 201
    assert with_quest.json()["quest_id"] == quest_id

    slot2 = await _get_a_slot(client, user)
    stand_alone = await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": slot2["slot_ref"], "party_size": 2},
        headers=auth_headers(user),
    )
    assert stand_alone.status_code == 201
    assert stand_alone.json()["quest_id"] is None


async def test_malformed_slot_ref_is_rejected(client, seed_reference_data):
    user = await register(client, email="book4@example.com", username="book4")
    resp = await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": "not-a-real-slot-ref", "party_size": 2},
        headers=auth_headers(user),
    )
    assert resp.status_code == 400


async def test_bookings_mine_lists_only_my_own_bookings(client, seed_reference_data):
    alice = await register(client, email="book5a@example.com", username="book5a")
    bob = await register(client, email="book5b@example.com", username="book5b")

    slot = await _get_a_slot(client, alice)
    await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": slot["slot_ref"], "party_size": 2},
        headers=auth_headers(alice),
    )

    alice_bookings = (await client.get("/bookings/mine", headers=auth_headers(alice))).json()
    bob_bookings = (await client.get("/bookings/mine", headers=auth_headers(bob))).json()
    assert len(alice_bookings) == 1
    assert len(bob_bookings) == 0


async def test_cancel_booking(client, seed_reference_data):
    alice = await register(client, email="book6a@example.com", username="book6a")
    bob = await register(client, email="book6b@example.com", username="book6b")

    slot = await _get_a_slot(client, alice)
    created = await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": slot["slot_ref"], "party_size": 2},
        headers=auth_headers(alice),
    )
    booking_id = created.json()["id"]

    # a stranger can't cancel someone else's booking
    forbidden = await client.post(f"/bookings/{booking_id}/cancel", headers=auth_headers(bob))
    assert forbidden.status_code == 404

    cancelled = await client.post(f"/bookings/{booking_id}/cancel", headers=auth_headers(alice))
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    already = await client.post(f"/bookings/{booking_id}/cancel", headers=auth_headers(alice))
    assert already.status_code == 409


async def test_booking_writes_a_payment_row(client, seed_reference_data):
    user = await register(client, email="book7@example.com", username="book7")
    slot = await _get_a_slot(client, user)
    await client.post(
        "/bookings",
        json={"activity_key": "bowling", "slot_ref": slot["slot_ref"], "party_size": 4},
        headers=auth_headers(user),
    )

    async with db_module.SessionLocal() as session:
        rows = (await session.scalars(select(Payment).where(Payment.type == PaymentType.booking))).all()
    assert len(rows) == 1
    assert rows[0].status.value == "succeeded"
    assert rows[0].provider == "fake"
