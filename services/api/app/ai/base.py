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


class AIProvider(Protocol):
    name: str

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        """Returns (draft, tokens_used) — tokens_used is None when a
        provider doesn't report it (Ollama doesn't)."""
        ...
