"""Append-only event logger — see app/models/analytics.py for why this
exists instead of (or ahead of) a real PostHog client.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent


def log_event(
    db: AsyncSession,
    *,
    event_type: str,
    user_id: UUID | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Stages an AnalyticsEvent row on the current session — caller commits
    (almost always alongside other work in the same transaction, same
    pattern as `xp_service.award_xp`)."""
    db.add(AnalyticsEvent(user_id=user_id, event_type=event_type, payload=payload or {}))
