from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.ai.base import (
    AIProvider,
    ItineraryCandidateQuest,
    ItineraryPlanningContext,
    QuestGenerationContext,
    QuestGenerationError,
    RecommendationExplanationContext,
)
from app.ai.service import get_ai_provider
from app.deps import CurrentUser, DbSession
from app.models.ai import AiGeneration
from app.models.commerce import CreatorQuest
from app.models.identity import Interest, UserInterest
from app.models.quests import Location, ParticipantStatus, Quest, QuestCategory, QuestStatus
from app.payments.base import PaymentProvider
from app.payments.service import get_payment_provider
from app.routers.quests import _get_quest_or_404
from app.schemas.ai import (
    ExplainRecommendationOut,
    ExplainRecommendationRequest,
    GeneratedQuestOut,
    GenerateQuestRequest,
    ItineraryPlanOut,
    PlanItineraryRequest,
    PlanStepOut,
)
from app.schemas.commerce import AiQuotaOut
from app.services import ai_quota_service, quest_service
from app.services.ai_quota_service import CreditsPurchaseError, QuotaExceededError
from app.services.compatibility_service import compute_compatibility

router = APIRouter(prefix="/ai", tags=["ai"])

AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]
PaymentProviderDep = Annotated[PaymentProvider, Depends(get_payment_provider)]

# Matches apps/web's BookActivityWidget exactly — see that component's
# ACTIVITIES constant. No backend-enforced catalog beyond this (the real
# booking endpoints accept any activity_key string); this is just what the
# planner is told it's allowed to propose.
KNOWN_ACTIVITY_KEYS = ("bowling", "karaoke", "restaurant_table", "escape_room")
_MAX_CANDIDATE_QUESTS = 10

# Human-readable phrasing for compute_compatibility's i18n label_keys — the
# explanation prompt needs plain English to reason with, not a display key.
_BREAKDOWN_LABELS = {
    "quest.compatCategory": "shared interest category",
    "quest.compatLocation": "close to your location",
    "quest.compatGroup": "a healthy group size (not empty, not full)",
}


@router.get("/quota", response_model=AiQuotaOut)
async def get_quota(current_user: CurrentUser, db: DbSession) -> AiQuotaOut:
    return await ai_quota_service.get_quota(db, current_user.id)


@router.post("/credits/purchase", response_model=AiQuotaOut)
async def purchase_credits(current_user: CurrentUser, db: DbSession, provider: PaymentProviderDep) -> AiQuotaOut:
    try:
        quota = await ai_quota_service.purchase_credits(db, user_id=current_user.id, provider=provider)
    except CreditsPurchaseError as exc:
        await db.commit()  # keep the Payment row (even a failed one) as an audit trail
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await db.commit()
    return quota


@router.post("/generate-quest", response_model=GeneratedQuestOut)
async def generate_quest(
    body: GenerateQuestRequest,
    current_user: CurrentUser,
    db: DbSession,
    provider: AIProviderDep,
) -> GeneratedQuestOut:
    categories = (await db.scalars(select(QuestCategory.key))).all()
    if not categories:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No quest categories seeded yet")

    try:
        await ai_quota_service.consume_quota(db, current_user.id)
    except QuotaExceededError as exc:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, str(exc)) from exc

    ctx = QuestGenerationContext(
        free_text=body.free_text,
        city=body.city,
        valid_category_keys=tuple(categories),
        lat=body.lat,
        lng=body.lng,
    )

    try:
        draft, tokens = await provider.generate_quest(ctx)
    except QuestGenerationError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    generation = AiGeneration(
        user_id=current_user.id,
        type="quest_generation",
        # Structured inputs only — never the raw free text as a "chat
        # transcript," per docs/AI.md §Logging & privacy. free_text itself
        # is what the user typed *about a plan*, not personal conversation,
        # so it's kept, but nothing beyond what was in the request.
        prompt_context={"free_text": body.free_text, "city": body.city, "lat": body.lat, "lng": body.lng},
        result={
            "title": draft.title,
            "description": draft.description,
            "category_key": draft.category_key,
            "difficulty": draft.difficulty,
            "duration_minutes": draft.duration_minutes,
            "budget_amount": draft.budget_amount,
            "xp_reward": draft.xp_reward,
            "objectives": draft.objectives,
        },
        provider=provider.name,
        tokens_used=tokens,
    )
    db.add(generation)
    await db.commit()
    await db.refresh(generation)

    return GeneratedQuestOut(
        generation_id=str(generation.id),
        title=draft.title,
        description=draft.description,
        category_key=draft.category_key,
        difficulty=draft.difficulty,
        duration_minutes=draft.duration_minutes,
        budget_amount=draft.budget_amount,
        xp_reward=draft.xp_reward,
        objectives=draft.objectives,
        provider=provider.name,
    )


@router.post("/plan-itinerary", response_model=ItineraryPlanOut)
async def plan_itinerary(
    body: PlanItineraryRequest,
    current_user: CurrentUser,
    db: DbSession,
    provider: AIProviderDep,
) -> ItineraryPlanOut:
    """Proposes a 2-4 step plan — join a real open quest, draft a new one,
    and/or book a real activity. Nothing here executes anything; every
    step the user confirms goes through the exact same endpoint a manual
    action would (POST /quests/{id}/join, POST /quests, POST /bookings).
    See docs/ROADMAP.md Phase 8's "not autonomous action" requirement.
    """
    categories = (await db.scalars(select(QuestCategory.key))).all()
    if not categories:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No quest categories seeded yet")

    try:
        await ai_quota_service.consume_quota(db, current_user.id)
    except QuotaExceededError as exc:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, str(exc)) from exc

    candidate_stmt = (
        select(Quest)
        .options(selectinload(Quest.category), selectinload(Quest.location))
        .where(
            Quest.deleted_at.is_(None),
            Quest.status == QuestStatus.open,
            Quest.id.not_in(select(CreatorQuest.quest_id)),  # marketplace quests aren't free to "join"
        )
        .order_by(Quest.start_time.asc())
        .limit(_MAX_CANDIDATE_QUESTS)
    )
    if body.lat is not None and body.lng is not None:
        min_lat, max_lat, min_lng, max_lng = quest_service.bounding_box(body.lat, body.lng, radius_km=15)
        candidate_stmt = candidate_stmt.join(Location).where(
            Location.lat.between(min_lat, max_lat), Location.lng.between(min_lng, max_lng)
        )
    candidate_quests = (await db.scalars(candidate_stmt)).all()
    candidates_by_id = {str(q.id): q for q in candidate_quests}

    ctx = ItineraryPlanningContext(
        free_text=body.free_text,
        city=body.city,
        valid_category_keys=tuple(categories),
        valid_activity_keys=KNOWN_ACTIVITY_KEYS,
        candidate_quests=tuple(
            ItineraryCandidateQuest(
                id=str(q.id), title=q.title, category_key=q.category.key, start_time=q.start_time.isoformat(), xp_reward=q.xp_reward
            )
            for q in candidate_quests
        ),
        lat=body.lat,
        lng=body.lng,
    )

    try:
        plan, tokens = await provider.plan_itinerary(ctx)
    except QuestGenerationError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    now = datetime.now(UTC)
    step_outs = []
    for step in plan.steps:
        suggested_start_time = (
            now + timedelta(minutes=step.start_offset_minutes) if step.start_offset_minutes is not None else None
        )
        quest_title = candidates_by_id[step.quest_id].title if step.quest_id in candidates_by_id else None
        step_outs.append(
            PlanStepOut(
                type=step.type,
                reason=step.reason,
                quest_id=step.quest_id,
                quest_title=quest_title,
                title=step.title,
                description=step.description,
                category_key=step.category_key,
                difficulty=step.difficulty,
                duration_minutes=step.duration_minutes,
                budget_amount=step.budget_amount,
                objectives=step.objectives,
                xp_reward=step.xp_reward,
                suggested_start_time=suggested_start_time,
                activity_key=step.activity_key,
                party_size=step.party_size,
            )
        )

    generation = AiGeneration(
        user_id=current_user.id,
        type="itinerary_planning",
        prompt_context={"free_text": body.free_text, "city": body.city, "lat": body.lat, "lng": body.lng},
        result={"steps": [s.model_dump(mode="json") for s in step_outs]},
        provider=provider.name,
        tokens_used=tokens,
    )
    db.add(generation)
    await db.commit()
    await db.refresh(generation)

    return ItineraryPlanOut(generation_id=str(generation.id), steps=step_outs, provider=provider.name)


@router.post("/explain-recommendation", response_model=ExplainRecommendationOut)
async def explain_recommendation(
    body: ExplainRecommendationRequest,
    current_user: CurrentUser,
    db: DbSession,
    provider: AIProviderDep,
) -> ExplainRecommendationOut:
    """The "predictive recommendations" piece of Phase 8 (docs/AI.md's
    roadmap step 5: LLM-assisted reasoning for *explaining* a
    recommendation) — grounded in the real compute_compatibility()
    breakdown, so the model explains actual computed signals rather than
    inventing a plausible-sounding but fabricated reason. Shares the same
    daily AI quota as quest generation / itinerary planning.
    """
    quest = await _get_quest_or_404(db, body.quest_id)

    interest_rows = await db.scalars(
        select(Interest.category).join(UserInterest, UserInterest.interest_id == Interest.id).where(
            UserInterest.user_id == current_user.id
        )
    )
    joined = len([p for p in quest.participants if p.status != ParticipantStatus.left])
    result = compute_compatibility(
        user_interest_category_keys=set(interest_rows.all()),
        quest_category_key=quest.category.key.removeprefix("category."),
        user_lat=body.lat,
        user_lng=body.lng,
        quest_lat=quest.location.lat,
        quest_lng=quest.location.lng,
        joined_count=joined,
        max_participants=quest.max_participants,
    )

    try:
        await ai_quota_service.consume_quota(db, current_user.id)
    except QuotaExceededError as exc:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, str(exc)) from exc

    ctx = RecommendationExplanationContext(
        quest_title=quest.title,
        quest_category_key=quest.category.key,
        compatibility_score=result.score,
        breakdown_labels=tuple(
            f"{_BREAKDOWN_LABELS.get(b.label_key, b.label_key)} ({b.points}pts)" for b in result.breakdown
        ),
    )

    try:
        explanation, tokens = await provider.explain_recommendation(ctx)
    except QuestGenerationError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc

    generation = AiGeneration(
        user_id=current_user.id,
        type="recommendation_explanation",
        prompt_context={"quest_id": str(body.quest_id), "lat": body.lat, "lng": body.lng},
        result={"explanation": explanation, "score": result.score},
        provider=provider.name,
        tokens_used=tokens,
    )
    db.add(generation)
    await db.commit()

    return ExplainRecommendationOut(explanation=explanation, score=result.score, provider=provider.name)
