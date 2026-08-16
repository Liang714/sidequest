from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.quests import (
    ParticipantStatus,
    QuestDifficulty,
    QuestStatus,
    QuestVisibility,
    VerificationType,
)


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
    distance_km: float | None = None


class QuestSummaryOut(BaseModel):
    id: UUID
    title: str
    category_key: str
    location_city: str
    start_time: datetime
    budget_amount: Decimal | None
    currency: str
    max_participants: int
    joined_count: int
    difficulty: QuestDifficulty
    status: QuestStatus
    xp_reward: int
    distance_km: float | None = None


class CompatibilityBreakdownOut(BaseModel):
    label_key: str
    points: int


class CompatibilityOut(BaseModel):
    score: int
    breakdown: list[CompatibilityBreakdownOut]
