from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.social import Notification
from app.schemas.chat import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    current_user: CurrentUser, db: DbSession, limit: int = Query(default=30, le=100, ge=1)
) -> list[NotificationOut]:
    rows = await db.scalars(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return [NotificationOut.model_validate(n) for n in rows.all()]


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(notification_id: UUID, current_user: CurrentUser, db: DbSession) -> NotificationOut:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        await db.commit()
    return NotificationOut.model_validate(notification)
