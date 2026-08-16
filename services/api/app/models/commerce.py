"""Subscriptions, payments, creator marketplace. See docs/DATABASE.md
§Commerce and §Business & creator. Built in Phase 6 — docs/ROADMAP.md.
"""

import enum
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import ForeignKey, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class SubscriptionPlan(str, enum.Enum):
    free = "free"
    pro = "pro"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    canceled = "canceled"


class PaymentType(str, enum.Enum):
    subscription = "subscription"
    quest_purchase = "quest_purchase"
    booking = "booking"  # Phase 7 — reserved now so the enum doesn't need a later migration
    ai_credits = "ai_credits"


class PaymentStatus(str, enum.Enum):
    succeeded = "succeeded"
    failed = "failed"


class Subscription(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # In practice only "pro" rows are ever created — "free" is the absence
    # of an active-or-not-yet-lapsed row, not a row of its own. The column
    # keeps both values per docs/DATABASE.md so a future plan tier isn't a
    # schema change, but app/services/subscription_service.py never
    # inserts plan=free.
    plan: Mapped[SubscriptionPlan] = mapped_column(default=SubscriptionPlan.pro)
    status: Mapped[SubscriptionStatus] = mapped_column(default=SubscriptionStatus.active)
    current_period_start: Mapped[datetime]
    current_period_end: Mapped[datetime]
    provider_ref: Mapped[str | None] = mapped_column(default=None)


class Payment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "payments"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[PaymentType]
    amount: Mapped[Decimal]
    currency: Mapped[str] = mapped_column(default="KRW")
    provider: Mapped[str]  # "fake" | "stripe" | "toss" — PaymentProvider.name
    provider_ref: Mapped[str]
    status: Mapped[PaymentStatus]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class Creator(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "creators"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    display_name: Mapped[str]
    follower_count: Mapped[int] = mapped_column(default=0)


class CreatorQuest(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "creator_quests"

    creator_id: Mapped[UUID] = mapped_column(ForeignKey("creators.id", ondelete="CASCADE"))
    # One quest can only ever be one creator's paid template — same
    # unique-FK pattern as business_quests.quest_id (app/models/business.py).
    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"), unique=True)
    price_amount: Mapped[Decimal]
    # Fixed platform default (see app/routers/creators.py) rather than
    # creator-configurable — one less economics knob to get wrong in a
    # Phase 6 foundation; per-creator rates are a real later feature, not
    # a schema change (the column already supports it).
    revenue_share_pct: Mapped[int] = mapped_column(SmallInteger)
