"""AI generation log. See docs/DATABASE.md — prompt_context stores
structured inputs only, never a raw chat transcript, per docs/AI.md
§Logging & privacy."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UUIDPrimaryKeyMixin


class AiGeneration(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ai_generations"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str]  # "quest_generation" | ...
    prompt_context: Mapped[dict[str, Any]] = mapped_column(JSONB)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB)
    provider: Mapped[str]
    tokens_used: Mapped[int | None] = mapped_column(default=None)
    # Set once the draft is actually published as a real quest — the
    # Phase 3 exit criteria (docs/ROADMAP.md) is measuring this conversion
    # rate, so it has to be recorded somewhere, not just implied.
    published_quest_id: Mapped[UUID | None] = mapped_column(ForeignKey("quests.id"), default=None)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
