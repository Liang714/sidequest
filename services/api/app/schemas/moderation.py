from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.social import ReportStatus, ReportTargetType


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: str = Field(min_length=1, max_length=500)


class ReportOut(BaseModel):
    """Full target context per docs/SECURITY.md's own promise — an admin
    should never need to go reconstruct what was reported from a bare ID.
    reporter_username/target_label are resolved server-side (see
    app/routers/moderation.py) rather than left as raw UUIDs for exactly
    that reason."""

    id: UUID
    reporter_id: UUID
    reporter_username: str
    target_type: ReportTargetType
    target_id: UUID
    target_label: str
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: datetime | None
    resolved_by: UUID | None


class ReportResolveAction(BaseModel):
    action: str = Field(pattern=r"^(action|dismiss)$")
