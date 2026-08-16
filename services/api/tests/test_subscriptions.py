"""Pro subscriptions — uses the real FakeProvider (PAYMENT_PROVIDER=fake is
the test/dev default, see app/payments/service.py), not a dependency
override, since "fake" already behaves exactly like a test double."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

import app.db as db_module
from app.models.commerce import Subscription
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


async def test_new_user_is_on_the_free_plan(client, seed_reference_data):
    user = await register(client, email="sub1@example.com", username="sub1")
    resp = await client.get("/subscriptions/me", headers=auth_headers(user))
    assert resp.status_code == 200
    assert resp.json() == {"plan": "free", "status": None, "current_period_end": None}


async def test_subscribe_charges_and_activates_pro(client, seed_reference_data):
    user = await register(client, email="sub2@example.com", username="sub2")
    resp = await client.post("/subscriptions/subscribe", headers=auth_headers(user))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["plan"] == "pro"
    assert body["status"] == "active"
    assert body["current_period_end"] is not None


async def test_subscribing_twice_is_rejected(client, seed_reference_data):
    user = await register(client, email="sub3@example.com", username="sub3")
    first = await client.post("/subscriptions/subscribe", headers=auth_headers(user))
    assert first.status_code == 200
    second = await client.post("/subscriptions/subscribe", headers=auth_headers(user))
    assert second.status_code == 400
    assert "already" in second.json()["detail"].lower()


async def test_cancel_stays_pro_until_period_end_then_reverts_to_free(client, seed_reference_data):
    user = await register(client, email="sub4@example.com", username="sub4")
    await client.post("/subscriptions/subscribe", headers=auth_headers(user))

    cancel = await client.post("/subscriptions/cancel", headers=auth_headers(user))
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "canceled"

    # still pro immediately after cancelling — the period already paid
    # for hasn't lapsed yet (standard non-renewing SaaS semantics)
    still_pro = await client.get("/subscriptions/me", headers=auth_headers(user))
    assert still_pro.json()["plan"] == "pro"

    # simulate the period actually ending
    async with db_module.SessionLocal() as session:
        sub = await session.scalar(select(Subscription).where(Subscription.provider_ref.isnot(None)))
        assert sub is not None
        sub.current_period_end = datetime.now(UTC) - timedelta(days=1)
        await session.commit()

    lapsed = await client.get("/subscriptions/me", headers=auth_headers(user))
    assert lapsed.json()["plan"] == "free"


async def test_cancel_with_no_subscription_is_rejected(client, seed_reference_data):
    user = await register(client, email="sub5@example.com", username="sub5")
    resp = await client.post("/subscriptions/cancel", headers=auth_headers(user))
    assert resp.status_code == 400


async def test_subscribe_writes_a_payment_row(client, seed_reference_data):
    user = await register(client, email="sub6@example.com", username="sub6")
    await client.post("/subscriptions/subscribe", headers=auth_headers(user))

    from app.models.commerce import Payment, PaymentType

    async with db_module.SessionLocal() as session:
        rows = (await session.scalars(select(Payment).where(Payment.type == PaymentType.subscription))).all()
    assert len(rows) == 1
    assert rows[0].status.value == "succeeded"
    assert rows[0].provider == "fake"
