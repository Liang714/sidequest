from uuid import UUID

from pydantic import BaseModel, Field

from app.models.social import ReportTargetType


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: str = Field(min_length=1, max_length=500)
