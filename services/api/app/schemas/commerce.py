from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.commerce import SubscriptionPlan, SubscriptionStatus
from app.schemas.quests import QuestCreate, QuestOut


class SubscriptionOut(BaseModel):
    plan: SubscriptionPlan
    status: SubscriptionStatus | None = None
    current_period_end: datetime | None = None


class AiQuotaOut(BaseModel):
    is_pro: bool
    daily_limit: int
    used_today: int
    credits_remaining: int


class CreatorCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=64)


class CreatorOut(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str
    follower_count: int


class CreatorQuestCreate(BaseModel):
    quest: QuestCreate
    price_amount: Decimal = Field(gt=0, le=200_000)


class CreatorQuestOut(BaseModel):
    id: UUID  # creator_quests.id
    creator_id: UUID
    quest: QuestOut
    price_amount: Decimal
    revenue_share_pct: int


class MarketplaceQuestOut(BaseModel):
    """Browsable preview shape for GET /marketplace/quests — deliberately
    not a full QuestOut (no objectives/participants) since these quests
    are paywalled: full detail only unlocks after purchase. See
    app/routers/creators.py."""

    id: UUID  # creator_quests.id
    quest_id: UUID
    creator_id: UUID
    title: str
    description: str
    category_key: str
    price_amount: Decimal
    currency: str
    creator_display_name: str
    already_purchased: bool
