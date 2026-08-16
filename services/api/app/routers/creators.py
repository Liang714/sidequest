"""Creator marketplace foundation (Phase 6) — a creator publishes a paid
quest template; buyers purchase it via PaymentProvider and are
auto-joined. See docs/API.md and docs/ROADMAP.md Phase 6.

Deliberately a *foundation*, not a fully-built marketplace — docs/PRD.md
§6 Non-goals explicitly rules a fully-built creator marketplace out for
v1: fixed platform revenue share (no creator-configurable rates), no
browsing filters/search, no creator payout disbursement (the
`revenue_share_pct` column and `payments` rows record what a payout
system would need to compute from, but nothing actually pays a creator
out yet).
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models.commerce import Creator, CreatorQuest, Payment, PaymentStatus, PaymentType
from app.models.quests import (
    CreatorType,
    Location,
    ParticipantStatus,
    Quest,
    QuestCategory,
    QuestObjective,
    QuestParticipant,
    QuestStatus,
)
from app.payments.base import PaymentError, PaymentProvider
from app.payments.service import get_payment_provider
from app.routers.quests import _get_quest_or_404, _to_quest_out
from app.schemas.commerce import (
    CreatorCreate,
    CreatorOut,
    CreatorQuestCreate,
    CreatorQuestOut,
    MarketplaceQuestOut,
)
from app.schemas.quests import QuestOut

router = APIRouter(tags=["creators"])

# Creator's share of a marketplace sale; platform keeps the remainder. See
# module docstring — not creator-configurable in this foundation.
PLATFORM_REVENUE_SHARE_PCT = 70

PaymentProviderDep = Annotated[PaymentProvider, Depends(get_payment_provider)]


def _to_creator_out(creator: Creator) -> CreatorOut:
    return CreatorOut(
        id=creator.id, user_id=creator.user_id, display_name=creator.display_name, follower_count=creator.follower_count
    )


@router.post("/creators", response_model=CreatorOut, status_code=status.HTTP_201_CREATED)
async def become_a_creator(body: CreatorCreate, current_user: CurrentUser, db: DbSession) -> CreatorOut:
    existing = await db.scalar(select(Creator).where(Creator.user_id == current_user.id))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Already registered as a creator")
    creator = Creator(user_id=current_user.id, display_name=body.display_name)
    db.add(creator)
    await db.commit()
    return _to_creator_out(creator)


@router.get("/creators/me", response_model=CreatorOut)
async def get_my_creator_profile(current_user: CurrentUser, db: DbSession) -> CreatorOut:
    creator = await db.scalar(select(Creator).where(Creator.user_id == current_user.id))
    if creator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You haven't registered as a creator yet")
    return _to_creator_out(creator)


@router.post("/creators/quests", response_model=CreatorQuestOut, status_code=status.HTTP_201_CREATED)
async def publish_creator_quest(
    body: CreatorQuestCreate, current_user: CurrentUser, db: DbSession
) -> CreatorQuestOut:
    creator = await db.scalar(select(Creator).where(Creator.user_id == current_user.id))
    if creator is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Register as a creator first")

    qbody = body.quest
    category = await db.scalar(select(QuestCategory).where(QuestCategory.key == qbody.category_key))
    if category is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown category '{qbody.category_key}'")

    location = Location(**qbody.location.model_dump())
    db.add(location)
    await db.flush()

    quest = Quest(
        creator_id=current_user.id,
        creator_type=CreatorType.creator,
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

    creator_quest = CreatorQuest(
        creator_id=creator.id,
        quest_id=quest.id,
        price_amount=body.price_amount,
        revenue_share_pct=PLATFORM_REVENUE_SHARE_PCT,
    )
    db.add(creator_quest)
    await db.commit()

    quest_out = await _to_quest_out(db, await _get_quest_or_404(db, quest.id), current_user_id=current_user.id)
    return CreatorQuestOut(
        id=creator_quest.id,
        creator_id=creator.id,
        quest=quest_out,
        price_amount=creator_quest.price_amount,
        revenue_share_pct=creator_quest.revenue_share_pct,
    )


@router.get("/marketplace/quests", response_model=list[MarketplaceQuestOut])
async def list_marketplace_quests(current_user: CurrentUser, db: DbSession) -> list[MarketplaceQuestOut]:
    rows = (
        await db.execute(
            select(CreatorQuest, Quest, Creator)
            .join(Quest, Quest.id == CreatorQuest.quest_id)
            .join(Creator, Creator.id == CreatorQuest.creator_id)
            .options(selectinload(Quest.category))
            .where(Quest.deleted_at.is_(None))
        )
    ).all()

    purchased_quest_ids = set(
        (
            await db.scalars(
                select(QuestParticipant.quest_id).where(
                    QuestParticipant.user_id == current_user.id,
                    QuestParticipant.status != ParticipantStatus.left,
                )
            )
        ).all()
    )

    return [
        MarketplaceQuestOut(
            id=cq.id,
            quest_id=quest.id,
            creator_id=creator.id,
            title=quest.title,
            description=quest.description,
            category_key=quest.category.key,
            price_amount=cq.price_amount,
            currency=quest.currency,
            creator_display_name=creator.display_name,
            already_purchased=quest.id in purchased_quest_ids,
        )
        for cq, quest, creator in rows
    ]


@router.post("/marketplace/{quest_id}/purchase", response_model=QuestOut)
async def purchase_marketplace_quest(
    quest_id: UUID, current_user: CurrentUser, db: DbSession, provider: PaymentProviderDep
) -> QuestOut:
    creator_quest = await db.scalar(select(CreatorQuest).where(CreatorQuest.quest_id == quest_id))
    if creator_quest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not a marketplace quest")

    quest = await _get_quest_or_404(db, quest_id)
    active = [p for p in quest.participants if p.status != ParticipantStatus.left]
    if any(p.user_id == current_user.id for p in active):
        raise HTTPException(status.HTTP_409_CONFLICT, "Already purchased")
    if len(active) >= quest.max_participants:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quest is full")

    try:
        charge = await provider.charge(
            amount=float(creator_quest.price_amount),
            currency=quest.currency,
            description=f"SIDEQUEST marketplace — {quest.title}",
        )
    except PaymentError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    db.add(
        Payment(
            user_id=current_user.id,
            type=PaymentType.quest_purchase,
            amount=creator_quest.price_amount,
            currency=quest.currency,
            provider=provider.name,
            provider_ref=charge.provider_ref,
            status=PaymentStatus.succeeded if charge.status == "succeeded" else PaymentStatus.failed,
        )
    )

    if charge.status != "succeeded":
        await db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment declined")

    db.add(QuestParticipant(quest_id=quest_id, user_id=current_user.id, status=ParticipantStatus.joined))
    await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)
