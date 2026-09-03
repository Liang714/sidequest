from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.business import SponsorshipType
from app.models.quests import (
    ParticipantStatus,
    QuestDifficulty,
    QuestStatus,
    QuestVisibility,
    VerificationType,
)
from app.schemas.gamification import AchievementOut


class LocationIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    place_name: str | None = None
    address: str | None = None
    city: str
    country: str = "KR"


class LocationOut(LocationIn):
    id: UUID

    model_config = {"from_attributes": True}


class ObjectiveIn(BaseModel):
    description: str = Field(min_length=1, max_length=280)
    verification_type: VerificationType = VerificationType.manual
    is_required: bool = True


class ObjectiveOut(BaseModel):
    id: UUID
    order_index: int
    description: str
    verification_type: VerificationType
    is_required: bool
    completed_by_me: bool = False

    model_config = {"from_attributes": True}


class QuestCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    category_key: str
    location: LocationIn
    start_time: datetime
    duration_minutes: int = Field(gt=0, le=24 * 60)
    budget_amount: Decimal | None = Field(default=None, ge=0)
    currency: str = "KRW"
    max_participants: int = Field(ge=2, le=50)
    difficulty: QuestDifficulty
    visibility: QuestVisibility = QuestVisibility.public
    xp_reward: int = Field(ge=0, le=2000)
    objectives: list[ObjectiveIn] = Field(default_factory=list)


class QuestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    status: QuestStatus | None = None


class ParticipantOut(BaseModel):
    user_id: UUID
    username: str
    status: ParticipantStatus

    model_config = {"from_attributes": True}


class SponsorInfoOut(BaseModel):
    """Present only on quests created via POST /businesses/{id}/quests
    (Phase 5) — see app/routers/business.py. Populated in QuestOut only
    (not QuestSummaryOut/discovery list cards) since that's where "why is
    this quest special" actually matters; discovery listings stay
    unchanged."""

    business_id: UUID
    business_name: str
    sponsorship_type: SponsorshipType
    discount_details: dict[str, Any] | None = None


class QuestOut(BaseModel):
    id: UUID
    creator_id: UUID
    title: str
    description: str
    category_key: str
    location: LocationOut
    start_time: datetime
    duration_minutes: int
    budget_amount: Decimal | None
    currency: str
    max_participants: int
    difficulty: QuestDifficulty
    status: QuestStatus
    visibility: QuestVisibility
    xp_reward: int
    joined_count: int
    objectives: list[ObjectiveOut]
    participants: list[ParticipantOut]
    sponsor: SponsorInfoOut | None = None
    distance_km: float | None = None


class QuestCompleteOut(BaseModel):
    """Response for POST /quests/{id}/complete — wraps the quest plus
    whatever gamification happened this call, so the client can show a
    completion moment (XP, level-up, new achievements) instead of a flat
    quest object. `xp_awarded`/`new_level`/`new_achievements` are all
    zero/None/empty on an idempotent repeat call (already completed)."""

    quest: QuestOut
    xp_awarded: int
    new_level: int | None = None
    new_achievements: list[AchievementOut] = Field(default_factory=list)


class ParticipantPreview(BaseModel):
    """Just enough of a person to render a face on a card.

    Deliberately tiny: an id to link to their profile, a name for the
    accessible label, and an avatar. No age, no last-seen, nothing
    appearance-adjacent — see PRD.md §6 and the Rule of Faces in
    docs/superpowers/specs/2026-08-27-crew-ui-design.md §H.
    """

    user_id: UUID
    display_name: str
    avatar_url: str | None = None


class QuestSummaryOut(BaseModel):
    id: UUID
    title: str
    category_key: str
    location_city: str
    #: The quest's public meeting point. A quest is a place people agree
    #: to meet, so this is public by nature — unlike a *user's* position,
    #: which is never exposed (docs/SECURITY.md). Lets the map plot real
    #: relative positions instead of a decorative spread.
    lat: float
    lng: float
    start_time: datetime
    budget_amount: Decimal | None
    currency: str
    max_participants: int
    joined_count: int
    difficulty: QuestDifficulty
    status: QuestStatus
    xp_reward: int
    distance_km: float | None = None
    #: Up to 4 people already in, so a discovery card can lead with who's
    #: going rather than with the activity. Empty when nobody has joined.
    participants: list[ParticipantPreview] = []


class CompatibilityBreakdownOut(BaseModel):
    label_key: str
    points: int


class CompatibilityOut(BaseModel):
    score: int
    breakdown: list[CompatibilityBreakdownOut]
