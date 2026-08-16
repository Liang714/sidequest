from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus


class AvailabilitySlotOut(BaseModel):
    slot_ref: str
    start_time: datetime
    capacity: int
    price_amount: Decimal
    currency: str


class BookingCreate(BaseModel):
    # The client echoes back the slot_ref chosen from a prior
    # GET /bookings/availability call — price is deliberately NOT part of
    # this request. The provider's book() call is the source of truth for
    # what actually gets charged (see BookingResult.price_amount); a
    # client-supplied price would just be an unenforced client assertion.
    quest_id: UUID | None = None
    activity_key: str = Field(min_length=1, max_length=64)
    slot_ref: str
    party_size: int = Field(ge=1, le=50)


class BookingOut(BaseModel):
    id: UUID
    quest_id: UUID | None
    provider: str
    provider_booking_ref: str
    status: BookingStatus
    amount: Decimal
    commission_amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}
