from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.business import BusinessVerificationStatus, SponsorshipType
from app.schemas.quests import LocationIn, LocationOut, QuestCreate, QuestOut


class BusinessCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str
    location: LocationIn
    description: str | None = Field(default=None, max_length=1000)


class BusinessOut(BaseModel):
    id: UUID
    owner_user_id: UUID
    name: str
    category: str
    verification_status: BusinessVerificationStatus
    location: LocationOut
    description: str | None
    created_at: datetime


class BusinessVerifyAction(BaseModel):
    action: str = Field(pattern="^(verify|reject)$")


class SponsoredQuestCreate(BaseModel):
    quest: QuestCreate
    sponsorship_type: SponsorshipType
    # Free-form on purpose — a % off, a fixed KRW amount, a free item, a
    # redemption code format, etc. all shape differently; see
    # app/services/business_service.py for how "redemption" is counted.
    discount_details: dict[str, Any] | None = None


class SponsoredQuestOut(BaseModel):
    id: UUID  # business_quests.id, not the quest id
    business_id: UUID
    quest: QuestOut
    sponsorship_type: SponsorshipType
    discount_details: dict[str, Any] | None


class QuestAnalyticsOut(BaseModel):
    quest_id: UUID
    title: str
    views: int
    joins: int
    completions: int
    redemptions: int


class BusinessAnalyticsOut(BaseModel):
    business_id: UUID
    total_views: int
    total_joins: int
    total_completions: int
    total_redemptions: int
    quests: list[QuestAnalyticsOut]
