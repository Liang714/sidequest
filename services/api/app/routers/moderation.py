from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentAdmin, CurrentUser, DbSession, RateLimit
from app.models.business import Business
from app.models.identity import User
from app.models.quests import Quest
from app.models.social import Message, Report, ReportStatus, ReportTargetType
from app.schemas.moderation import ReportCreate, ReportOut, ReportResolveAction

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


async def _target_label(db: DbSession, target_type: ReportTargetType, target_id: UUID) -> str:
    """Resolves a human-readable label for whatever got reported — the
    whole point of ReportOut per docs/SECURITY.md: an admin should never
    have to go reconstruct context from a bare target_id themselves."""
    if target_type == ReportTargetType.user:
        user = await db.get(User, target_id)
        return f"@{user.username}" if user else "(deleted user)"
    if target_type == ReportTargetType.quest:
        quest = await db.get(Quest, target_id)
        return quest.title if quest else "(deleted quest)"
    if target_type == ReportTargetType.business:
        business = await db.get(Business, target_id)
        return business.name if business else "(deleted business)"
    if target_type == ReportTargetType.message:
        message = await db.get(Message, target_id)
        return f'"{message.content[:80]}"' if message else "(deleted message)"
    return "(unknown)"


async def _to_report_out(db: DbSession, report: Report) -> ReportOut:
    reporter = await db.get(User, report.reporter_id)
    return ReportOut(
        id=report.id,
        reporter_id=report.reporter_id,
        reporter_username=reporter.username if reporter else "(deleted user)",
        target_type=report.target_type,
        target_id=report.target_id,
        target_label=await _target_label(db, report.target_type, report.target_id),
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        resolved_at=report.resolved_at,
        resolved_by=report.resolved_by,
    )


@router.get("/admin/reports", response_model=list[ReportOut])
async def admin_list_reports(
    current_admin: CurrentAdmin,
    db: DbSession,
    status_filter: Annotated[ReportStatus | None, Query(alias="status")] = None,
) -> list[ReportOut]:
    """Defaults to the open queue (the actual moderation work) — pass
    ?status=actioned or ?status=dismissed to see resolved history. Mirrors
    GET /admin/businesses' exact shape (app/routers/business.py)."""
    stmt = (
        select(Report)
        .where(Report.status == (status_filter or ReportStatus.open))
        .order_by(Report.created_at.asc())  # oldest-open-first — a real queue, not a feed
    )
    reports = (await db.scalars(stmt)).all()
    return [await _to_report_out(db, r) for r in reports]


@router.post("/admin/reports/{report_id}/resolve", response_model=ReportOut)
async def admin_resolve_report(
    report_id: UUID, body: ReportResolveAction, current_admin: CurrentAdmin, db: DbSession
) -> ReportOut:
    report = await db.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    if report.status != ReportStatus.open:
        raise HTTPException(status.HTTP_409_CONFLICT, "Report is already resolved")

    report.status = ReportStatus.actioned if body.action == "action" else ReportStatus.dismissed
    report.resolved_at = datetime.now(UTC)
    report.resolved_by = current_admin.id
    await db.commit()
    return await _to_report_out(db, report)
