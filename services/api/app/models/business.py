"""Business accounts + sponsored quests. See docs/DATABASE.md.

A business account can sponsor a quest (plain sponsorship, a discount
reward, or a challenge) once an admin has verified it — see
app/deps.py::CurrentAdmin and app/routers/business.py. Unverified
businesses can register and see their own (empty) dashboard, but
POST /businesses/{id}/quests is gated on
verification_status == verified so sponsorship can't be used as a spam
vector — see docs/SECURITY.md and the Phase 5 user story: "As an admin, I
want to verify business accounts before they can sponsor quests."
"""

import enum
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.quests import Location


class BusinessVerificationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class SponsorshipType(str, enum.Enum):
    sponsored = "sponsored"
    discount = "discount"
    challenge = "challenge"


class Business(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "businesses"

    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str]
    category: Mapped[str]
    verification_status: Mapped[BusinessVerificationStatus] = mapped_column(
        default=BusinessVerificationStatus.pending
    )
    location_id: Mapped[UUID] = mapped_column(ForeignKey("locations.id"))
    description: Mapped[str | None] = mapped_column(default=None)

    location: Mapped[Location] = relationship()


class BusinessQuest(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "business_quests"

    business_id: Mapped[UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    # One quest can only ever be sponsored by one business — a plain
    # unique FK is enough, no need for a composite key here.
    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"), unique=True)
    sponsorship_type: Mapped[SponsorshipType]
    discount_details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, default=None)
