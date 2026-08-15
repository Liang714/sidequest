"""XP ledger, achievements. See docs/DATABASE.md — xp_transactions is the
append-only source of truth; Profile.xp/level (identity.py) is a cache."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class Achievement(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "achievements"

    key: Mapped[str] = mapped_column(unique=True)  # i18n key + lookup key
    icon: Mapped[str]
    criteria: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    achievement_id: Mapped[UUID] = mapped_column(
        ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class XpTransaction(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "xp_transactions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    delta: Mapped[int]
    reason: Mapped[str]
    related_quest_id: Mapped[UUID | None] = mapped_column(ForeignKey("quests.id"), default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
