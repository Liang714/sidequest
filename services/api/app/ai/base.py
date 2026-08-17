"""Provider-agnostic AI types. See docs/AI.md — AIService resolves one of
these providers; no other module talks to an LLM SDK directly.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class QuestGenerationContext:
    free_text: str
    city: str
    valid_category_keys: tuple[str, ...]
    lat: float | None = None
    lng: float | None = None


@dataclass(frozen=True)
class GeneratedQuest:
    title: str
    description: str
    category_key: str
    difficulty: str  # "easy" | "medium" | "hard" | "epic"
    duration_minutes: int
    budget_amount: float | None
    xp_reward: int
    objectives: list[str]


class QuestGenerationError(Exception):
    """Raised when a provider can't produce a usable draft (unreachable,
    malformed output survives retries, etc.) — routers turn this into a
    502, never a raw 500."""


@dataclass(frozen=True)
class ItineraryCandidateQuest:
    """A real, currently-open quest the planner is allowed to propose
    joining — the model only ever sees/references ids from this list,
    never invents one (see app/ai/itinerary_prompt.py's parsing)."""

    id: str
    title: str
    category_key: str
    start_time: str  # ISO 8601
    xp_reward: int


@dataclass(frozen=True)
class ItineraryPlanningContext:
    free_text: str
    city: str
    valid_category_keys: tuple[str, ...]
    valid_activity_keys: tuple[str, ...]
    candidate_quests: tuple[ItineraryCandidateQuest, ...]
    lat: float | None = None
    lng: float | None = None


@dataclass(frozen=True)
class PlanStep:
    """One proposed step in a multi-step itinerary — deliberately a single
    flat shape covering all three step types rather than a class per type
    (mirrors GeneratedQuest's "clamp a loosely-typed dict" precedent in
    app/ai/prompt.py). Only the fields relevant to `type` are populated;
    routers/ai.py never executes a step itself — see docs/ROADMAP.md
    Phase 8's "not autonomous action" requirement. Every step, once a user
    confirms it, goes through the exact same endpoint a manual join/
    create/book would (POST /quests/{id}/join, POST /quests,
    POST /bookings) — the planner only ever proposes.
    """

    type: str  # "join_quest" | "create_quest" | "book_activity"
    reason: str
    # join_quest
    quest_id: str | None = None
    # create_quest — same shape as GeneratedQuest plus a start offset,
    # since an itinerary step needs to say *when*, not just *what*.
    title: str | None = None
    description: str | None = None
    category_key: str | None = None
    difficulty: str | None = None
    duration_minutes: int | None = None
    budget_amount: float | None = None
    objectives: list[str] | None = None
    xp_reward: int | None = None
    start_offset_minutes: int | None = None
    # book_activity
    activity_key: str | None = None
    party_size: int | None = None


@dataclass(frozen=True)
class ItineraryPlan:
    steps: list[PlanStep]


@dataclass(frozen=True)
class RecommendationExplanationContext:
    """Grounds the explanation in the REAL, already-computed
    compute_compatibility() breakdown — see app/services/compatibility_service.py
    — so the model explains actual signals rather than inventing a
    plausible-sounding but fabricated reason."""

    quest_title: str
    quest_category_key: str
    compatibility_score: int
    breakdown_labels: tuple[str, ...]


class AIProvider(Protocol):
    name: str

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        """Returns (draft, tokens_used) — tokens_used is None when a
        provider doesn't report it (Ollama doesn't)."""
        ...

    async def plan_itinerary(self, ctx: ItineraryPlanningContext) -> tuple[ItineraryPlan, int | None]:
        """Returns (plan, tokens_used) — same tokens_used convention as
        generate_quest."""
        ...

    async def explain_recommendation(self, ctx: RecommendationExplanationContext) -> tuple[str, int | None]:
        """Returns (explanation, tokens_used) — one short sentence, plain
        text (no JSON schema needed for a single sentence)."""
        ...
