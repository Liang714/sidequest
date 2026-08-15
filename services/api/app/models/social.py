"""Quest room messages, notifications, reports. See docs/DATABASE.md."""

import enum
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class ReportTargetType(str, enum.Enum):
    user = "user"
    quest = "quest"
    business = "business"
    message = "message"


class ReportStatus(str, enum.Enum):
    open = "open"
    actioned = "actioned"
    dismissed = "dismissed"


class Message(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "messages"

    quest_id: Mapped[UUID] = mapped_column(ForeignKey("quests.id", ondelete="CASCADE"))
    sender_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    content: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    deleted_at: Mapped[datetime | None] = mapped_column(default=None)


class Notification(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str]
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))


class Report(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "reports"

    reporter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    target_type: Mapped[ReportTargetType]
    target_id: Mapped[UUID]
    reason: Mapped[str]
    status: Mapped[ReportStatus] = mapped_column(default=ReportStatus.open)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    resolved_at: Mapped[datetime | None] = mapped_column(default=None)
    resolved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), default=None)
