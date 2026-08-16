"""Booking creation + commission tracking. See docs/DATABASE.md's
`bookings` table and docs/ROADMAP.md Phase 7's exit criteria: "commission
correctly recorded against bookings.commission_amount."

The user pays the full slot price through `PaymentProvider` (same
mechanism as subscriptions/credits/marketplace purchases — see
app/payments/); `commission_amount` is SIDEQUEST's cut of that, computed
at a fixed rate. In a real integration the remainder (`amount -
commission_amount`) is what would get remitted to the venue/provider —
no disbursement mechanism exists yet, same honest gap as
`creator_quests.revenue_share_pct` having no payout system either.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.bookings.base import BookingError, BookingProvider
from app.models.booking import Booking, BookingStatus
from app.models.commerce import Payment, PaymentStatus, PaymentType
from app.payments.base import PaymentError, PaymentProvider
from app.schemas.booking import AvailabilitySlotOut

COMMISSION_PCT = Decimal(15)


class BookingCreationError(Exception):
    """Client-actionable — an unrecognized slot, a declined charge, or the
    provider rejecting the booking. Routers turn this into a 400/502."""


async def get_availability(
    provider: BookingProvider, *, activity_key: str, on_date: date, party_size: int
) -> list[AvailabilitySlotOut]:
    slots = await provider.check_availability(activity_key=activity_key, on_date=on_date, party_size=party_size)
    return [
        AvailabilitySlotOut(
            slot_ref=s.slot_ref, start_time=s.start_time, capacity=s.capacity, price_amount=Decimal(str(s.price_amount)), currency=s.currency
        )
        for s in slots
    ]


async def create_booking(
    db: AsyncSession,
    *,
    user_id: UUID,
    quest_id: UUID | None,
    slot_ref: str,
    party_size: int,
    booking_provider: BookingProvider,
    payment_provider: PaymentProvider,
) -> Booking:
    try:
        result = await booking_provider.book(
            slot_ref=slot_ref, party_size=party_size, description="SIDEQUEST booking"
        )
    except BookingError as exc:
        raise BookingCreationError(str(exc)) from exc

    if result.status != "confirmed":
        raise BookingCreationError("The provider declined this booking")

    amount = Decimal(str(result.price_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    commission = (amount * COMMISSION_PCT / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    try:
        charge = await payment_provider.charge(
            amount=float(amount), currency=result.currency, description="SIDEQUEST booking"
        )
    except PaymentError as exc:
        raise BookingCreationError(str(exc)) from exc

    db.add(
        Payment(
            user_id=user_id,
            type=PaymentType.booking,
            amount=amount,
            currency=result.currency,
            provider=payment_provider.name,
            provider_ref=charge.provider_ref,
            status=PaymentStatus.succeeded if charge.status == "succeeded" else PaymentStatus.failed,
        )
    )

    if charge.status != "succeeded":
        await db.flush()
        raise BookingCreationError("Payment declined")

    booking = Booking(
        quest_id=quest_id,
        user_id=user_id,
        provider=booking_provider.name,
        provider_booking_ref=result.provider_booking_ref,
        status=BookingStatus.confirmed,
        amount=amount,
        commission_amount=commission,
    )
    db.add(booking)
    await db.flush()
    return booking
