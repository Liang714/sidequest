"""Business accounts, sponsored quests, and business analytics (Phase 5).
See docs/API.md and docs/ROADMAP.md Phase 5."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentAdmin, CurrentUser, DbSession
from app.models.business import Business, BusinessQuest, BusinessVerificationStatus
from app.models.quests import (
    CreatorType,
    Location,
    Quest,
    QuestCategory,
    QuestObjective,
    QuestStatus,
)
from app.routers.quests import _get_quest_or_404, _to_quest_out
from app.schemas.business import (
    BusinessAnalyticsOut,
    BusinessCreate,
    BusinessOut,
    BusinessVerifyAction,
    SponsoredQuestCreate,
    SponsoredQuestOut,
)
from app.schemas.quests import LocationOut
from app.services.business_service import get_business_analytics

router = APIRouter(tags=["business"])


async def _get_business_or_404(db: DbSession, business_id: UUID) -> Business:
    business = await db.scalar(
        select(Business).options(selectinload(Business.location)).where(Business.id == business_id)
    )
    if business is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Business not found")
    return business


def _require_owner_or_admin(business: Business, current_user: CurrentUser) -> None:
    if business.owner_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your business")


def _to_business_out(business: Business) -> BusinessOut:
    return BusinessOut(
        id=business.id,
        owner_user_id=business.owner_user_id,
        name=business.name,
        category=business.category,
        verification_status=business.verification_status,
        location=LocationOut.model_validate(business.location),
        description=business.description,
        created_at=business.created_at,
    )


async def _to_sponsored_quest_out(db: DbSession, bq: BusinessQuest, current_user_id: UUID) -> SponsoredQuestOut:
    quest_out = await _to_quest_out(db, await _get_quest_or_404(db, bq.quest_id), current_user_id=current_user_id)
    return SponsoredQuestOut(
        id=bq.id,
        business_id=bq.business_id,
        quest=quest_out,
        sponsorship_type=bq.sponsorship_type,
        discount_details=bq.discount_details,
    )


@router.post("/businesses", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create_business(body: BusinessCreate, current_user: CurrentUser, db: DbSession) -> BusinessOut:
    location = Location(**body.location.model_dump())
    db.add(location)
    await db.flush()

    business = Business(
        owner_user_id=current_user.id,
        name=body.name,
        category=body.category,
        location_id=location.id,
        description=body.description,
    )
    db.add(business)
    await db.commit()
    return _to_business_out(await _get_business_or_404(db, business.id))


@router.get("/businesses/mine", response_model=list[BusinessOut])
async def my_businesses(current_user: CurrentUser, db: DbSession) -> list[BusinessOut]:
    businesses = (
        await db.scalars(
            select(Business)
            .options(selectinload(Business.location))
            .where(Business.owner_user_id == current_user.id)
        )
    ).all()
    return [_to_business_out(b) for b in businesses]


@router.get("/businesses/{business_id}", response_model=BusinessOut)
async def get_business(business_id: UUID, current_user: CurrentUser, db: DbSession) -> BusinessOut:
    return _to_business_out(await _get_business_or_404(db, business_id))


@router.post(
    "/businesses/{business_id}/quests", response_model=SponsoredQuestOut, status_code=status.HTTP_201_CREATED
)
async def create_sponsored_quest(
    business_id: UUID, body: SponsoredQuestCreate, current_user: CurrentUser, db: DbSession
) -> SponsoredQuestOut:
    business = await _get_business_or_404(db, business_id)
    if business.owner_user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your business")
    if business.verification_status != BusinessVerificationStatus.verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Business is not verified yet")

    qbody = body.quest
    category = await db.scalar(select(QuestCategory).where(QuestCategory.key == qbody.category_key))
    if category is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown category '{qbody.category_key}'")

    location = Location(**qbody.location.model_dump())
    db.add(location)
    await db.flush()

    quest = Quest(
        creator_id=current_user.id,
        creator_type=CreatorType.business,
        category_id=category.id,
        title=qbody.title,
        description=qbody.description,
        location_id=location.id,
        start_time=qbody.start_time,
        duration_minutes=qbody.duration_minutes,
        budget_amount=qbody.budget_amount,
        currency=qbody.currency,
        max_participants=qbody.max_participants,
        difficulty=qbody.difficulty,
        visibility=qbody.visibility,
        xp_reward=qbody.xp_reward,
        status=QuestStatus.open,
    )
    db.add(quest)
    await db.flush()

    for i, obj in enumerate(qbody.objectives):
        db.add(
            QuestObjective(
                quest_id=quest.id,
                order_index=i,
                description=obj.description,
                verification_type=obj.verification_type,
                is_required=obj.is_required,
            )
        )

    business_quest = BusinessQuest(
        business_id=business.id,
        quest_id=quest.id,
        sponsorship_type=body.sponsorship_type,
        discount_details=body.discount_details,
    )
    db.add(business_quest)
    await db.commit()

    return await _to_sponsored_quest_out(db, business_quest, current_user.id)


@router.get("/businesses/{business_id}/quests", response_model=list[SponsoredQuestOut])
async def list_sponsored_quests(business_id: UUID, current_user: CurrentUser, db: DbSession) -> list[SponsoredQuestOut]:
    business = await _get_business_or_404(db, business_id)
    _require_owner_or_admin(business, current_user)
    rows = (await db.scalars(select(BusinessQuest).where(BusinessQuest.business_id == business_id))).all()
    return [await _to_sponsored_quest_out(db, bq, current_user.id) for bq in rows]


@router.get("/businesses/{business_id}/analytics", response_model=BusinessAnalyticsOut)
async def business_analytics(business_id: UUID, current_user: CurrentUser, db: DbSession) -> BusinessAnalyticsOut:
    business = await _get_business_or_404(db, business_id)
    _require_owner_or_admin(business, current_user)
    return await get_business_analytics(db, business_id)


@router.get("/admin/businesses", response_model=list[BusinessOut])
async def admin_list_businesses(
    current_admin: CurrentAdmin,
    db: DbSession,
    status_filter: Annotated[BusinessVerificationStatus | None, Query(alias="status")] = None,
) -> list[BusinessOut]:
    """Defaults to the pending queue (the actual moderation work) —
    pass ?status=verified or ?status=rejected to see the rest."""
    stmt = select(Business).options(selectinload(Business.location))
    stmt = stmt.where(Business.verification_status == (status_filter or BusinessVerificationStatus.pending))
    businesses = (await db.scalars(stmt)).all()
    return [_to_business_out(b) for b in businesses]


@router.post("/admin/businesses/{business_id}/verify", response_model=BusinessOut)
async def admin_verify_business(
    business_id: UUID, body: BusinessVerifyAction, current_admin: CurrentAdmin, db: DbSession
) -> BusinessOut:
    business = await _get_business_or_404(db, business_id)
    business.verification_status = (
        BusinessVerificationStatus.verified if body.action == "verify" else BusinessVerificationStatus.rejected
    )
    await db.commit()
    return _to_business_out(await _get_business_or_404(db, business_id))
