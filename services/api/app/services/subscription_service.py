"""Pro subscription logic — see docs/DATABASE.md's `subscriptions` table.

A user is "pro" if they have a Subscription row that's either still
`active`, or `canceled` but not yet past its `current_period_end` — the
standard "stays pro until the period you already paid for ends" SaaS
semantics; cancelling doesn't claw back time already paid for.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce import (
    Payment,
    PaymentStatus,
    PaymentType,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.payments.base import PaymentError, PaymentProvider
from app.schemas.commerce import SubscriptionOut

PRO_MONTHLY_PRICE = Decimal(9900)
PRO_MONTHLY_CURRENCY = "KRW"
PRO_PERIOD_DAYS = 30


class SubscriptionError(Exception):
    """Client-actionable — already subscribed, nothing to cancel, or the
    charge was declined. Routers turn this into a 400, not a 500."""


async def _latest_subscription(db: AsyncSession, user_id: UUID) -> Subscription | None:
    sub = await db.scalar(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.current_period_end.desc())
    )
    return sub


async def is_pro(db: AsyncSession, user_id: UUID) -> bool:
    sub = await _latest_subscription(db, user_id)
    if sub is None:
        return False
    if sub.status == SubscriptionStatus.active:
        return True
    return sub.status == SubscriptionStatus.canceled and sub.current_period_end > datetime.now(UTC)


async def get_subscription_out(db: AsyncSession, user_id: UUID) -> SubscriptionOut:
    sub = await _latest_subscription(db, user_id)
    if sub is None or not await is_pro(db, user_id):
        return SubscriptionOut(plan=SubscriptionPlan.free)
    return SubscriptionOut(plan=SubscriptionPlan.pro, status=sub.status, current_period_end=sub.current_period_end)


async def subscribe(db: AsyncSession, *, user_id: UUID, provider: PaymentProvider) -> Subscription:
    if await is_pro(db, user_id):
        raise SubscriptionError("Already subscribed to Pro")

    try:
        charge = await provider.charge(
            amount=float(PRO_MONTHLY_PRICE), currency=PRO_MONTHLY_CURRENCY, description="SIDEQUEST Pro — monthly"
        )
    except PaymentError as exc:
        raise SubscriptionError(str(exc)) from exc

    now = datetime.now(UTC)
    db.add(
        Payment(
            user_id=user_id,
            type=PaymentType.subscription,
            amount=PRO_MONTHLY_PRICE,
            currency=PRO_MONTHLY_CURRENCY,
            provider=provider.name,
            provider_ref=charge.provider_ref,
            status=PaymentStatus.succeeded if charge.status == "succeeded" else PaymentStatus.failed,
        )
    )

    if charge.status != "succeeded":
        await db.flush()
        raise SubscriptionError("Payment declined")

    sub = Subscription(
        user_id=user_id,
        plan=SubscriptionPlan.pro,
        status=SubscriptionStatus.active,
        current_period_start=now,
        current_period_end=now + timedelta(days=PRO_PERIOD_DAYS),
        provider_ref=charge.provider_ref,
    )
    db.add(sub)
    await db.flush()
    return sub


async def cancel(db: AsyncSession, *, user_id: UUID) -> Subscription:
    sub = await _latest_subscription(db, user_id)
    if sub is None or sub.status != SubscriptionStatus.active:
        raise SubscriptionError("No active Pro subscription to cancel")
    sub.status = SubscriptionStatus.canceled
    await db.flush()
    return sub
