"""Bookings + commission tracking. See docs/DATABASE.md §Commerce. Built
in Phase 7 — docs/ROADMAP.md."""

import enum
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class Booking(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "bookings"

    # Nullable — a booking can exist on its own (e.g. a restaurant table)
    # without being tied to any SideQuest, per docs/DATABASE.md.
    quest_id: Mapped[UUID | None] = mapped_column(ForeignKey("quests.id"), default=None)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str]  # BookingProvider.name — "fake" today
    provider_booking_ref: Mapped[str]
    status: Mapped[BookingStatus] = mapped_column(default=BookingStatus.confirmed)
    amount: Mapped[Decimal]
    # SIDEQUEST's cut of `amount` — the remainder is what a real
    # integration would remit to the venue/provider. Fixed rate today
    # (app/services/booking_service.py), not provider- or activity-specific.
    commission_amount: Mapped[Decimal]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
