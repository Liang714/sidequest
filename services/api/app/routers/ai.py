from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.ai.base import AIProvider, QuestGenerationContext, QuestGenerationError
from app.ai.service import get_ai_provider
from app.deps import CurrentUser, DbSession
from app.models.ai import AiGeneration
from app.models.quests import QuestCategory
from app.schemas.ai import GeneratedQuestOut, GenerateQuestRequest

router = APIRouter(prefix="/ai", tags=["ai"])

AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]


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
