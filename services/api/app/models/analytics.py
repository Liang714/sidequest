"""Lightweight internal event log — the local/dev stand-in for the PostHog
integration documented in docs/ARCHITECTURE.md and docs/DEPLOYMENT.md.

Same honesty pattern as `LocalDiskStorageProvider` standing in for R2 and
self-issued JWTs standing in for Supabase Auth: this table exists so the
Phase 4 exit criteria ("achievement unlock rate and profile-stats
engagement tracked" — docs/ROADMAP.md) is actually measurable today,
without requiring a real PostHog account. Swapping in a real PostHog
client later means calling `posthog.capture()` alongside (or instead of)
`log_event()` — this table's shape doesn't need to change for that.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class AnalyticsEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "analytics_events"

    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), default=None)
    event_type: Mapped[str]  # e.g. "achievement_unlocked", "profile_stats_viewed"
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
