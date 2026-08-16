"""Users, profiles, interests, friends, blocks. See docs/DATABASE.md."""

import enum
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    deactivated = "deactivated"


class FriendStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    blocked = "blocked"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(unique=True, index=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    locale: Mapped[str] = mapped_column(default="en")
    status: Mapped[UserStatus] = mapped_column(default=UserStatus.active)
    # No admin signup flow, on purpose — flipped via `uv run python -m
    # app.make_admin <email>` (see that script's docstring). Gates
    # app/deps.py::CurrentAdmin, used by business verification today.
    is_admin: Mapped[bool] = mapped_column(default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)

    profile: Mapped["Profile"] = relationship(back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    display_name: Mapped[str]
    real_name: Mapped[str | None] = mapped_column(default=None)
    bio: Mapped[str | None] = mapped_column(default=None)
    avatar_url: Mapped[str | None] = mapped_column(default=None)
    birth_date: Mapped[date | None] = mapped_column(default=None)
    visibility_settings: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    # Denormalized cache — source of truth is xp_transactions (gamification.py).
    xp: Mapped[int] = mapped_column(default=0)
    level: Mapped[int] = mapped_column(default=1)
    # Phase 6: a simple wallet, not a ledger — unlike xp (which needs an
    # audit trail for anti-cheat/dispute reasons), AI credits are just a
    # balance purchased via app/routers/ai.py's credits-purchase endpoint
    # and spent by app/services/ai_quota_service.py. See docs/ROADMAP.md.
    ai_credits: Mapped[int] = mapped_column(default=0)

    user: Mapped[User] = relationship(back_populates="profile")


class Interest(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "interests"

    key: Mapped[str] = mapped_column(unique=True)  # i18n key, e.g. "interest.dance"
    category: Mapped[str]


class UserInterest(Base):
    __tablename__ = "user_interests"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    interest_id: Mapped[UUID] = mapped_column(
        ForeignKey("interests.id", ondelete="CASCADE"), primary_key=True
    )
    weight: Mapped[float] = mapped_column(default=1.0)


class Friend(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "friends"
    __table_args__ = (CheckConstraint("requester_id <> addressee_id", name="ck_friends_not_self"),)

    requester_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    addressee_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[FriendStatus] = mapped_column(default=FriendStatus.pending)
    responded_at: Mapped[datetime | None] = mapped_column(default=None)


class Block(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id", name="uq_blocks_pair"),)

    blocker_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    blocked_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
