"""FakeAIProvider / FakeVisionProvider — the production-safe fallbacks
selected via AI_PROVIDER=fake / VISION_PROVIDER=fake for a hosted
deployment where Ollama isn't reachable (see docs/DEPLOYMENT.md). Direct
unit tests against the classes themselves, same reasoning as test_ai.py's
docstring: provider *selection* (app/ai/service.py, app/vision/service.py)
is a one-line factory not worth integration-testing; these classes' own
output shape is the part worth covering.
"""

from app.ai.base import ItineraryCandidateQuest as CandidateQuest
from app.ai.base import (
    ItineraryPlanningContext,
    QuestGenerationContext,
    RecommendationExplanationContext,
)
from app.ai.providers.fake import FakeAIProvider
from app.vision.providers.fake import FakeVisionProvider


async def test_fake_ai_generate_quest_returns_valid_category() -> None:
    provider = FakeAIProvider()
    ctx = QuestGenerationContext(
        free_text="bored near Hongdae",
        city="Seoul",
        valid_category_keys=("category.photography", "category.food"),
    )
    draft, tokens = await provider.generate_quest(ctx)
    assert draft.category_key == "category.photography"
    assert draft.title
    assert draft.objectives
    assert tokens is None


async def test_fake_ai_plan_itinerary_joins_a_real_candidate_when_available() -> None:
    provider = FakeAIProvider()
    ctx = ItineraryPlanningContext(
        free_text="something fun tonight",
        city="Seoul",
        valid_category_keys=("category.random",),
        valid_activity_keys=("bowling",),
        candidate_quests=(
            CandidateQuest(id="q1", title="Hongdae Karaoke", category_key="category.music", start_time="2026-09-01T19:00:00+00:00", xp_reward=150),
        ),
    )
    plan, tokens = await provider.plan_itinerary(ctx)
    assert len(plan.steps) == 1
    assert plan.steps[0].type == "join_quest"
    assert plan.steps[0].quest_id == "q1"
    assert tokens is None


async def test_fake_ai_plan_itinerary_falls_back_to_create_quest_with_no_candidates() -> None:
    provider = FakeAIProvider()
    ctx = ItineraryPlanningContext(
        free_text="something fun tonight",
        city="Seoul",
        valid_category_keys=("category.random",),
        valid_activity_keys=("bowling",),
        candidate_quests=(),
    )
    plan, _ = await provider.plan_itinerary(ctx)
    assert len(plan.steps) == 1
    assert plan.steps[0].type == "create_quest"
    assert plan.steps[0].category_key == "category.random"


async def test_fake_ai_explain_recommendation_discloses_demo_mode() -> None:
    provider = FakeAIProvider()
    ctx = RecommendationExplanationContext(
        quest_title="Hongdae Karaoke",
        quest_category_key="category.music",
        compatibility_score=88,
        breakdown_labels=("Shared interest",),
    )
    explanation, tokens = await provider.explain_recommendation(ctx)
    assert "demo mode" in explanation
    assert tokens is None


async def test_fake_vision_never_falsely_claims_a_match() -> None:
    provider = FakeVisionProvider()
    result = await provider.verify(image_bytes=b"not-a-real-photo", objective_description="a red circle")
    assert result.matches is False
    assert result.confidence == 0.0
    assert "demo mode" in result.explanation
