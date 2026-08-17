from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GenerateQuestRequest(BaseModel):
    free_text: str = Field(min_length=1, max_length=500)
    city: str = "Seoul"
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class GeneratedQuestOut(BaseModel):
    generation_id: str
    title: str
    description: str
    category_key: str
    difficulty: str
    duration_minutes: int
    budget_amount: float | None
    xp_reward: int
    objectives: list[str]
    provider: str


class PlanItineraryRequest(BaseModel):
    free_text: str = Field(min_length=1, max_length=500)
    city: str = "Seoul"
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class PlanStepOut(BaseModel):
    """One proposed step — never executed by this response. The client
    confirms a step by calling the normal join/create/book endpoint
    itself; see docs/API.md §AI concierge."""

    type: str
    reason: str
    quest_id: str | None = None
    quest_title: str | None = None  # denormalized from the candidate list, for display only
    title: str | None = None
    description: str | None = None
    category_key: str | None = None
    difficulty: str | None = None
    duration_minutes: int | None = None
    budget_amount: float | None = None
    objectives: list[str] | None = None
    xp_reward: int | None = None
    suggested_start_time: datetime | None = None  # now + start_offset_minutes, resolved server-side
    activity_key: str | None = None
    party_size: int | None = None


class ItineraryPlanOut(BaseModel):
    generation_id: str
    steps: list[PlanStepOut]
    provider: str


class ExplainRecommendationRequest(BaseModel):
    quest_id: UUID
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class ExplainRecommendationOut(BaseModel):
    explanation: str
    score: int
    provider: str
