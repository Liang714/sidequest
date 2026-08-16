"""Business accounts, verification gate, sponsored quests, and business
analytics — Phase 5. See docs/ROADMAP.md Phase 5 exit criteria."""

import pytest
from sqlalchemy import select

import app.db as db_module
from app.models.identity import User
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


def _business_payload(**overrides):
    payload = {
        "name": "ABC Dance Studio",
        "category": "dance",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "description": "A local dance studio.",
    }
    payload.update(overrides)
    return payload


def _sponsored_quest_payload(**overrides):
    payload = {
        "quest": {
            "title": "Free Salsa Taster Class",
            "description": "Sponsored beginner class, first 10 people free.",
            "category_key": "category.dance",
            "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
            "start_time": "2026-09-01T19:00:00+00:00",
            "duration_minutes": 60,
            "max_participants": 10,
            "difficulty": "easy",
            "xp_reward": 150,
            "objectives": [],
        },
        "sponsorship_type": "discount",
        "discount_details": {"kind": "free_class", "value": "100%"},
    }
    payload.update(overrides)
    return payload


async def _make_admin(email: str) -> None:
    async with db_module.SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        assert user is not None
        user.is_admin = True
        await session.commit()


async def test_business_registration_starts_pending(client, seed_reference_data):
    owner = await register(client, email="biz1@example.com", username="biz1")
    resp = await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["verification_status"] == "pending"
    assert body["name"] == "ABC Dance Studio"


async def test_unverified_business_cannot_create_sponsored_quest(client, seed_reference_data):
    owner = await register(client, email="biz2@example.com", username="biz2")
    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()

    resp = await client.post(
        f"/businesses/{biz['id']}/quests", json=_sponsored_quest_payload(), headers=auth_headers(owner)
    )
    assert resp.status_code == 403
    assert "not verified" in resp.json()["detail"].lower()


async def test_non_owner_cannot_create_sponsored_quest_for_someone_elses_business(client, seed_reference_data):
    owner = await register(client, email="biz3@example.com", username="biz3")
    intruder = await register(client, email="biz3b@example.com", username="biz3b")
    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()

    resp = await client.post(
        f"/businesses/{biz['id']}/quests", json=_sponsored_quest_payload(), headers=auth_headers(intruder)
    )
    assert resp.status_code == 403


async def test_non_admin_cannot_call_admin_endpoints(client, seed_reference_data):
    owner = await register(client, email="biz4@example.com", username="biz4")
    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()

    list_resp = await client.get("/admin/businesses", headers=auth_headers(owner))
    assert list_resp.status_code == 403

    verify_resp = await client.post(
        f"/admin/businesses/{biz['id']}/verify", json={"action": "verify"}, headers=auth_headers(owner)
    )
    assert verify_resp.status_code == 403


async def test_admin_verify_unlocks_sponsored_quest_creation(client, seed_reference_data):
    owner = await register(client, email="biz5@example.com", username="biz5")
    admin = await register(client, email="admin5@example.com", username="admin5")
    await _make_admin("admin5@example.com")

    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()

    # shows up in the default (pending) admin queue
    pending = (await client.get("/admin/businesses", headers=auth_headers(admin))).json()
    assert any(b["id"] == biz["id"] for b in pending)

    verify = await client.post(
        f"/admin/businesses/{biz['id']}/verify", json={"action": "verify"}, headers=auth_headers(admin)
    )
    assert verify.status_code == 200
    assert verify.json()["verification_status"] == "verified"

    # no longer in the pending queue, but shows under ?status=verified
    pending_after = (await client.get("/admin/businesses", headers=auth_headers(admin))).json()
    assert not any(b["id"] == biz["id"] for b in pending_after)
    verified_list = (await client.get("/admin/businesses?status=verified", headers=auth_headers(admin))).json()
    assert any(b["id"] == biz["id"] for b in verified_list)

    create = await client.post(
        f"/businesses/{biz['id']}/quests", json=_sponsored_quest_payload(), headers=auth_headers(owner)
    )
    assert create.status_code == 201, create.text
    sponsored = create.json()
    assert sponsored["quest"]["sponsor"]["business_name"] == "ABC Dance Studio"
    assert sponsored["quest"]["sponsor"]["sponsorship_type"] == "discount"

    # the sponsor badge also shows up on a plain quest-detail fetch
    quest_id = sponsored["quest"]["id"]
    detail = (await client.get(f"/quests/{quest_id}", headers=auth_headers(owner))).json()
    assert detail["sponsor"]["business_id"] == biz["id"]


async def test_business_analytics_counts_views_joins_completions_and_discount_redemptions(
    client, seed_reference_data
):
    owner = await register(client, email="biz6@example.com", username="biz6")
    admin = await register(client, email="admin6@example.com", username="admin6")
    await _make_admin("admin6@example.com")
    participant = await register(client, email="biz6p@example.com", username="biz6p")

    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()
    await client.post(f"/admin/businesses/{biz['id']}/verify", json={"action": "verify"}, headers=auth_headers(admin))

    sponsored = (
        await client.post(
            f"/businesses/{biz['id']}/quests", json=_sponsored_quest_payload(), headers=auth_headers(owner)
        )
    ).json()
    quest_id = sponsored["quest"]["id"]

    # a participant views the quest, joins it, and completes it (no objectives)
    await client.get(f"/quests/{quest_id}", headers=auth_headers(participant))
    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(participant))
    await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(participant))

    analytics = (await client.get(f"/businesses/{biz['id']}/analytics", headers=auth_headers(owner))).json()
    assert analytics["total_joins"] == 1
    assert analytics["total_completions"] == 1
    assert analytics["total_redemptions"] == 1  # discount sponsorship -> completion counts as a redemption
    assert analytics["total_views"] >= 1
    assert len(analytics["quests"]) == 1
    assert analytics["quests"][0]["quest_id"] == quest_id

    # a non-owner, non-admin can't see the analytics
    forbidden = await client.get(f"/businesses/{biz['id']}/analytics", headers=auth_headers(participant))
    assert forbidden.status_code == 403

    # admin can see it too
    as_admin = await client.get(f"/businesses/{biz['id']}/analytics", headers=auth_headers(admin))
    assert as_admin.status_code == 200


async def test_non_discount_sponsorship_never_counts_redemptions(client, seed_reference_data):
    owner = await register(client, email="biz7@example.com", username="biz7")
    admin = await register(client, email="admin7@example.com", username="admin7")
    await _make_admin("admin7@example.com")
    participant = await register(client, email="biz7p@example.com", username="biz7p")

    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()
    await client.post(f"/admin/businesses/{biz['id']}/verify", json={"action": "verify"}, headers=auth_headers(admin))

    sponsored = (
        await client.post(
            f"/businesses/{biz['id']}/quests",
            json=_sponsored_quest_payload(sponsorship_type="sponsored", discount_details=None),
            headers=auth_headers(owner),
        )
    ).json()
    quest_id = sponsored["quest"]["id"]

    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(participant))
    await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(participant))

    analytics = (await client.get(f"/businesses/{biz['id']}/analytics", headers=auth_headers(owner))).json()
    assert analytics["total_completions"] == 1
    assert analytics["total_redemptions"] == 0


async def test_businesses_mine_and_quests_listing(client, seed_reference_data):
    owner = await register(client, email="biz8@example.com", username="biz8")
    admin = await register(client, email="admin8@example.com", username="admin8")
    await _make_admin("admin8@example.com")

    biz = (await client.post("/businesses", json=_business_payload(), headers=auth_headers(owner))).json()
    mine = (await client.get("/businesses/mine", headers=auth_headers(owner))).json()
    assert len(mine) == 1 and mine[0]["id"] == biz["id"]

    await client.post(f"/admin/businesses/{biz['id']}/verify", json={"action": "verify"}, headers=auth_headers(admin))
    await client.post(f"/businesses/{biz['id']}/quests", json=_sponsored_quest_payload(), headers=auth_headers(owner))

    quests = (await client.get(f"/businesses/{biz['id']}/quests", headers=auth_headers(owner))).json()
    assert len(quests) == 1
    assert quests[0]["sponsorship_type"] == "discount"

    other_user = await register(client, email="biz8b@example.com", username="biz8b")
    forbidden = await client.get(f"/businesses/{biz['id']}/quests", headers=auth_headers(other_user))
    assert forbidden.status_code == 403
