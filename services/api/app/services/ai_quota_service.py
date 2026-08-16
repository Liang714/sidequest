"""Free/Pro AI generation quota + credit-pack purchases. See
docs/ROADMAP.md Phase 6 and docs/AI.md.

Free tier: FREE_DAILY_LIMIT quest generations per day, refilled at
midnight UTC (not local wall-clock time — keeps quota resets independent
of a user's timezone, consistent with the rest of the app's TIMESTAMPTZ/
UTC convention). Pro: unlimited. Either tier can spend purchased
`Profile.ai_credits` once the daily free quota is used up, as an
alternative to upgrading — a real one-off top-up, not a Pro-only perk.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai import AiGeneration
from app.models.commerce import Payment, PaymentStatus, PaymentType
from app.models.identity import Profile
from app.payments.base import PaymentError, PaymentProvider
from app.schemas.commerce import AiQuotaOut
from app.services.subscription_service import is_pro

FREE_DAILY_LIMIT = 3
CREDIT_PACK_SIZE = 10
CREDIT_PACK_PRICE = Decimal(3900)
CREDIT_PACK_CURRENCY = "KRW"


class QuotaExceededError(Exception):
    """Free daily limit is used up and there are no credits left —
    routers turn this into a 402, not a 500."""


class CreditsPurchaseError(Exception):
    """The charge for a credit pack failed. Routers turn this into a 400."""


async def _used_today(db: AsyncSession, user_id: UUID) -> int:
    since = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.scalar(
        select(func.count())
        .select_from(AiGeneration)
        .where(
            AiGeneration.user_id == user_id,
            AiGeneration.type == "quest_generation",
            AiGeneration.created_at >= since,
        )
    )
    return count or 0


async def get_quota(db: AsyncSession, user_id: UUID) -> AiQuotaOut:
    profile = await db.get(Profile, user_id)
    assert profile is not None
    return AiQuotaOut(
        is_pro=await is_pro(db, user_id),
        daily_limit=FREE_DAILY_LIMIT,
        used_today=await _used_today(db, user_id),
        credits_remaining=profile.ai_credits,
    )


async def consume_quota(db: AsyncSession, user_id: UUID) -> None:
    """Called right before an AI generation actually runs — must run
    *before* the AiGeneration row for this call is written (routers/ai.py),
    since _used_today() counts that same row on the next call. Pro users
    and anyone still under the free daily limit pass through free; past
    that, a purchased credit is spent; past that, raises."""
    if await is_pro(db, user_id):
        return
    if await _used_today(db, user_id) < FREE_DAILY_LIMIT:
        return

    profile = await db.get(Profile, user_id)
    assert profile is not None
    if profile.ai_credits > 0:
        profile.ai_credits -= 1
        return

    raise QuotaExceededError(
        f"Free daily limit ({FREE_DAILY_LIMIT}) used up — upgrade to Pro or buy an AI credit pack."
    )


async def purchase_credits(db: AsyncSession, *, user_id: UUID, provider: PaymentProvider) -> AiQuotaOut:
    try:
        charge = await provider.charge(
            amount=float(CREDIT_PACK_PRICE),
            currency=CREDIT_PACK_CURRENCY,
            description=f"SIDEQUEST AI credits — pack of {CREDIT_PACK_SIZE}",
        )
    except PaymentError as exc:
        raise CreditsPurchaseError(str(exc)) from exc

    db.add(
        Payment(
            user_id=user_id,
            type=PaymentType.ai_credits,
            amount=CREDIT_PACK_PRICE,
            currency=CREDIT_PACK_CURRENCY,
            provider=provider.name,
            provider_ref=charge.provider_ref,
            status=PaymentStatus.succeeded if charge.status == "succeeded" else PaymentStatus.failed,
        )
    )

    if charge.status != "succeeded":
        await db.flush()
        raise CreditsPurchaseError("Payment declined")

    profile = await db.get(Profile, user_id)
    assert profile is not None
    profile.ai_credits += CREDIT_PACK_SIZE
    await db.flush()
    return await get_quota(db, user_id)
