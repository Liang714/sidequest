from typing import Any

from fastapi import APIRouter, status

from app.deps import CurrentUser, DbSession, RateLimit
from app.models.social import Report
from app.schemas.moderation import ReportCreate

router = APIRouter(tags=["moderation"])


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: ReportCreate, current_user: CurrentUser, db: DbSession, _rl: None = RateLimit("report", 10)
) -> dict[str, Any]:
    report = Report(
        reporter_id=current_user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        reason=body.reason,
    )
    db.add(report)
    await db.commit()
    return {"id": str(report.id), "status": report.status.value}
