"""Bookings + commission tracking (Phase 7 foundation). See docs/API.md
and docs/ROADMAP.md Phase 7."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.bookings.base import BookingError, BookingProvider
from app.bookings.service import get_booking_provider
from app.deps import CurrentUser, DbSession
from app.models.booking import Booking, BookingStatus
from app.payments.base import PaymentProvider
from app.payments.service import get_payment_provider
from app.schemas.booking import AvailabilitySlotOut, BookingCreate, BookingOut
from app.services import booking_service
from app.services.booking_service import BookingCreationError

router = APIRouter(prefix="/bookings", tags=["bookings"])

BookingProviderDep = Annotated[BookingProvider, Depends(get_booking_provider)]
PaymentProviderDep = Annotated[PaymentProvider, Depends(get_payment_provider)]


@router.get("/availability", response_model=list[AvailabilitySlotOut])
async def get_availability(
    current_user: CurrentUser,
    provider: BookingProviderDep,
    activity_key: Annotated[str, Query(min_length=1, max_length=64)],
    on_date: Annotated[date, Query()],
    party_size: Annotated[int, Query(ge=1, le=50)] = 2,
) -> list[AvailabilitySlotOut]:
    try:
        return await booking_service.get_availability(
            provider, activity_key=activity_key, on_date=on_date, party_size=party_size
        )
    except BookingError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    body: BookingCreate,
    current_user: CurrentUser,
    db: DbSession,
    booking_provider: BookingProviderDep,
    payment_provider: PaymentProviderDep,
) -> BookingOut:
    try:
        booking = await booking_service.create_booking(
            db,
            user_id=current_user.id,
            quest_id=body.quest_id,
            slot_ref=body.slot_ref,
            party_size=body.party_size,
            booking_provider=booking_provider,
            payment_provider=payment_provider,
        )
    except BookingCreationError as exc:
        await db.commit()  # keep the Payment row (even a failed one) as an audit trail
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await db.commit()
    return BookingOut.model_validate(booking)


@router.get("/mine", response_model=list[BookingOut])
async def my_bookings(current_user: CurrentUser, db: DbSession) -> list[BookingOut]:
    rows = (
        await db.scalars(
            select(Booking).where(Booking.user_id == current_user.id).order_by(Booking.created_at.desc())
        )
    ).all()
    return [BookingOut.model_validate(b) for b in rows]


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: UUID, current_user: CurrentUser, db: DbSession) -> BookingOut:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already cancelled")
    booking.status = BookingStatus.cancelled
    await db.commit()
    return BookingOut.model_validate(booking)
