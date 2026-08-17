"""Fake AIProvider — a zero-cost, deterministic placeholder, and the
production-safe default for deployments that have neither a reachable
Ollama host (the free/local dev provider — not reachable from a hosted
environment like Fly.io) nor a paid ANTHROPIC_API_KEY configured yet.

Deliberately different from app/payments/providers/fake.py and
app/bookings/providers/fake.py: those exist to unblock *development*
against a provider that would otherwise cost real money or need a vendor
account, and their fake output (a successful charge, a synthetic booking
slot) is meant to look and behave like the real thing for testing. This
one is meant to be **user-facing in production** until a real key is
added, so its output is honestly labeled as a placeholder rather than
silently pretending to be AI-generated — same disclosure ethic as
VisionVerifier's measured-accuracy advisory (see docs/AI.md).
"""

from app.ai.base import (
    GeneratedQuest,
    ItineraryPlan,
    ItineraryPlanningContext,
    PlanStep,
    QuestGenerationContext,
    RecommendationExplanationContext,
)

DEMO_NOTICE = (
    "AI features are running in demo mode for this deployment — no live AI "
    "provider is configured. Set AI_PROVIDER=anthropic + ANTHROPIC_API_KEY "
    "(see .env.example and docs/DEPLOYMENT.md) for real AI-generated content."
)


class FakeAIProvider:
    name = "fake"

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        category_key = ctx.valid_category_keys[0] if ctx.valid_category_keys else "category.random"
        draft = GeneratedQuest(
            title=f"Demo quest: {ctx.free_text[:60] or 'something fun'}",
            description=DEMO_NOTICE,
            category_key=category_key,
            difficulty="easy",
            duration_minutes=90,
            budget_amount=None,
            xp_reward=150,
            objectives=["Meet up with the group", "Have a good time"],
        )
        return draft, None

    async def plan_itinerary(self, ctx: ItineraryPlanningContext) -> tuple[ItineraryPlan, int | None]:
        if ctx.candidate_quests:
            candidate = ctx.candidate_quests[0]
            step = PlanStep(type="join_quest", reason=DEMO_NOTICE, quest_id=candidate.id)
        else:
            category_key = ctx.valid_category_keys[0] if ctx.valid_category_keys else "category.random"
            step = PlanStep(
                type="create_quest",
                reason=DEMO_NOTICE,
                title=f"Demo plan for: {ctx.free_text[:60] or 'your goal'}",
                description=DEMO_NOTICE,
                category_key=category_key,
                difficulty="easy",
                duration_minutes=90,
                budget_amount=None,
                objectives=["Meet up", "Enjoy the activity together"],
                xp_reward=150,
                start_offset_minutes=60,
            )
        return ItineraryPlan(steps=[step]), None

    async def explain_recommendation(self, ctx: RecommendationExplanationContext) -> tuple[str, int | None]:
        return DEMO_NOTICE, None
