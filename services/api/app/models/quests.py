"""Locations, quests, participants, objectives, completion. See docs/DATABASE.md.

Note: `locations` stores plain lat/lng here, not a PostGIS GEOGRAPHY column —
this machine has no PostGIS available yet (see docs/DATABASE.md indexing
notes / the Phase 2 infra decision log). Nearby search uses a bounding-box
+ haversine calculation in app/services/quest_service.py instead of
ST_DWithin. The `geog` column and GIST index drop in via a later migration
once real Postgres+PostGIS infra exists — no application-layer rework
needed since callers go through the same "nearby quests" service function.
"""

import enum
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, SmallInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CreatorType(str, enum.Enum):
    user = "user"
    business = "business"
    creator = "creator"
    ai = "ai"


class QuestVisibility(str, enum.Enum):
    public = "public"
    friends = "friends"
    private = "private"


class QuestStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    full = "full"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class QuestDifficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"
    epic = "epic"


class ParticipantStatus(str, enum.Enum):
    joined = "joined"
    checked_in = "checked_in"
    completed = "completed"
    left = "left"
    removed = "removed"


class VerificationType(str, enum.Enum):
    manual = "manual"
    photo = "photo"
    qr = "qr"
    geofence = "geofence"
    business_confirm = "business_confirm"


class ModerationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Location(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "locations"

    lat: Mapped[float]
    lng: Mapped[float]
    place_name: Mapped[str | None] = mapped_column(default=None)
    address: Mapped[str | None] = mapped_column(default=None)
    city: Mapped[str]
    country: Mapped[str] = mapped_column(default="KR")


class QuestCategory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_categories"

    key: Mapped[str] = mapped_column(unique=True)  # i18n key, e.g. "category.dance"
    icon: Mapped[str]
    sort_order: Mapped[int] = mapped_column(default=0)


class Quest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quests"

    creator_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    creator_type: Mapped[CreatorType] = mapped_column(default=CreatorType.user)
    category_id: Mapped[UUID] = mapped_column(ForeignKey("quest_categories.id"))
    title: Mapped[str]
    description: Mapped[str]
    visibility: Mapped[QuestVisibility] = mapped_column(default=QuestVisibility.public)
    location_id: Mapped[UUID] = mapped_column(ForeignKey("locations.id"))
    start_time: Mapped[datetime]
    duration_minutes: Mapped[int]
    budget_amount: Mapped[Decimal | None] = mapped_column(default=None)
    currency: Mapped[str] = mapped_column(default="KRW")
    max_participants: Mapped[int] = mapped_column(SmallInteger)
    difficulty: Mapped[QuestDifficulty]
    status: Mapped[QuestStatus] = mapped_column(default=QuestStatus.open)
    price_amount: Mapped[Decimal | None] = mapped_column(default=None)
    xp_reward: Mapped[int]
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)

    location: Mapped[Location] = relationship()
    category: Mapped[QuestCategory] = relationship()
    objectives: Mapped[list["QuestObjective"]] = relationship(
        back_populates="quest", order_by="QuestObjective.order_index"
    )
    participants: Mapped[list["QuestParticipant"]] = relationship(back_populates="quest")


class QuestParticipant(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_participants"
    __table_args__ = (UniqueConstraint("quest_id", "user_id", name="uq_quest_participant"),)

    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[ParticipantStatus] = mapped_column(default=ParticipantStatus.joined)
    joined_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    checked_in_at: Mapped[datetime | None] = mapped_column(default=None)
    completed_at: Mapped[datetime | None] = mapped_column(default=None)

    quest: Mapped[Quest] = relationship(back_populates="participants")


class QuestObjective(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_objectives"

    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"))
    order_index: Mapped[int] = mapped_column(SmallInteger)
    description: Mapped[str]
    verification_type: Mapped[VerificationType] = mapped_column(default=VerificationType.manual)
    is_required: Mapped[bool] = mapped_column(default=True)

    quest: Mapped[Quest] = relationship(back_populates="objectives")


class QuestObjectiveCompletion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_objective_completions"
    __table_args__ = (UniqueConstraint("objective_id", "user_id", name="uq_objective_user"),)

    objective_id: Mapped[UUID] = mapped_column(ForeignKey("quest_objectives.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    evidence_photo_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("quest_photos.id"), default=None
    )
    verified: Mapped[bool] = mapped_column(default=False)
    verified_at: Mapped[datetime | None] = mapped_column(default=None)
    verification_method: Mapped[str] = mapped_column(default="manual")


class QuestCompletion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_completions"
    __table_args__ = (UniqueConstraint("quest_id", "user_id", name="uq_quest_completion"),)

    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    completed_at: Mapped[datetime]
    xp_awarded: Mapped[int]


class QuestPhoto(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "quest_photos"

    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    storage_key: Mapped[str]
    moderation_status: Mapped[ModerationStatus] = mapped_column(default=ModerationStatus.pending)
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)
