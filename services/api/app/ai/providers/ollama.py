"""Local Ollama provider — the dev default (see docs/AI.md and
app/config.py). Free, self-hosted, no API key. Swap to AnthropicProvider
in production by setting AI_PROVIDER=anthropic; nothing else changes."""

import httpx

from app.ai.base import (
    GeneratedQuest,
    ItineraryPlan,
    ItineraryPlanningContext,
    QuestGenerationContext,
    QuestGenerationError,
    RecommendationExplanationContext,
)
from app.ai.explanation_prompt import (
    EXPLANATION_SYSTEM_PROMPT,
    build_explanation_user_prompt,
    clean_explanation,
)
from app.ai.itinerary_prompt import (
    ITINERARY_SYSTEM_PROMPT,
    build_itinerary_user_prompt,
    parse_itinerary_json,
)
from app.ai.prompt import SYSTEM_PROMPT, build_user_prompt, parse_quest_json


class OllamaProvider:
    name = "ollama"

    def __init__(self, host: str, model: str) -> None:
        self.host = host.rstrip("/")
        self.model = model

    async def _generate(self, system: str, prompt: str, *, json_format: bool = True) -> tuple[str, int | None]:
        payload: dict[str, object] = {"model": self.model, "system": system, "prompt": prompt, "stream": False}
        if json_format:
            payload["format"] = "json"
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.host}/api/generate", json=payload)
                resp.raise_for_status()
                body = resp.json()
        except httpx.HTTPError as exc:
            raise QuestGenerationError(f"Ollama unreachable at {self.host}: {exc}") from exc
        tokens = body.get("eval_count")
        return body.get("response", ""), tokens if isinstance(tokens, int) else None

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        raw, tokens = await self._generate(SYSTEM_PROMPT, build_user_prompt(ctx))
        return parse_quest_json(raw, ctx), tokens

    async def plan_itinerary(self, ctx: ItineraryPlanningContext) -> tuple[ItineraryPlan, int | None]:
        raw, tokens = await self._generate(ITINERARY_SYSTEM_PROMPT, build_itinerary_user_prompt(ctx))
        return parse_itinerary_json(raw, ctx), tokens

    async def explain_recommendation(self, ctx: RecommendationExplanationContext) -> tuple[str, int | None]:
        raw, tokens = await self._generate(
            EXPLANATION_SYSTEM_PROMPT, build_explanation_user_prompt(ctx), json_format=False
        )
        return clean_explanation(raw), tokens
