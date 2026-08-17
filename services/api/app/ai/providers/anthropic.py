"""Claude provider — the documented production target (docs/AI.md). Needs
ANTHROPIC_API_KEY; see app/config.py. Uses tool use (forced tool_choice)
for structured output rather than prompting for JSON and hoping — the
current recommended way to get reliable structured output from Claude,
and it means no regex/repair parsing here unlike the Ollama provider.
"""

import json

from anthropic import AsyncAnthropic

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

_QUEST_TOOL_NAME = "create_quest_draft"

_QUEST_TOOL_SCHEMA = {
    "name": _QUEST_TOOL_NAME,
    "description": "Records a generated SideQuest draft.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "category_key": {"type": "string"},
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard", "epic"]},
            "duration_minutes": {"type": "integer"},
            "budget_amount": {"type": ["number", "null"]},
            "objectives": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 6},
        },
        "required": ["title", "description", "category_key", "difficulty", "duration_minutes", "objectives"],
    },
}

_ITINERARY_TOOL_NAME = "propose_itinerary_plan"

# One flexible step shape covering all three types (join_quest/create_quest/
# book_activity) rather than a oneOf union — matches PlanStep's own "one
# flat shape, only the relevant fields populated" design in app/ai/base.py,
# and keeps this schema simple instead of fighting tool-use's union support.
_ITINERARY_TOOL_SCHEMA = {
    "name": _ITINERARY_TOOL_NAME,
    "description": "Records a proposed multi-step SideQuest itinerary. Never executes anything.",
    "input_schema": {
        "type": "object",
        "properties": {
            "steps": {
                "type": "array",
                "minItems": 1,
                "maxItems": 4,
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": ["join_quest", "create_quest", "book_activity"]},
                        "reason": {"type": "string"},
                        "quest_id": {"type": "string"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "category_key": {"type": "string"},
                        "difficulty": {"type": "string", "enum": ["easy", "medium", "hard", "epic"]},
                        "duration_minutes": {"type": "integer"},
                        "budget_amount": {"type": ["number", "null"]},
                        "objectives": {"type": "array", "items": {"type": "string"}},
                        "start_offset_minutes": {"type": "integer"},
                        "activity_key": {"type": "string"},
                        "party_size": {"type": "integer"},
                    },
                    "required": ["type", "reason"],
                },
            }
        },
        "required": ["steps"],
    },
}


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        try:
            # The SDK's overloads want its own MessageParam/ToolParam
            # TypedDicts, not plain dicts — structurally identical at
            # runtime, mypy just can't pick an overload from plain dict
            # literals. Narrower than a blanket ignore: only this call.
            message = await self._client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_user_prompt(ctx)}],
                tools=[_QUEST_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": _QUEST_TOOL_NAME},
            )  # type: ignore[call-overload]
        except Exception as exc:  # anthropic.APIError and friends
            raise QuestGenerationError(f"Anthropic API call failed: {exc}") from exc

        tool_use = next((b for b in message.content if b.type == "tool_use"), None)
        if tool_use is None:
            raise QuestGenerationError("Claude did not return a tool_use block")

        # Reuse the same clamping/validation as the Ollama path by routing
        # through parse_quest_json on the re-serialized structured input —
        # keeps exactly one place that decides what's a valid draft.
        quest = parse_quest_json(json.dumps(tool_use.input), ctx)
        tokens = getattr(message.usage, "output_tokens", None)
        return quest, tokens

    async def plan_itinerary(self, ctx: ItineraryPlanningContext) -> tuple[ItineraryPlan, int | None]:
        try:
            message = await self._client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=ITINERARY_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_itinerary_user_prompt(ctx)}],
                tools=[_ITINERARY_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": _ITINERARY_TOOL_NAME},
            )  # type: ignore[call-overload]
        except Exception as exc:
            raise QuestGenerationError(f"Anthropic API call failed: {exc}") from exc

        tool_use = next((b for b in message.content if b.type == "tool_use"), None)
        if tool_use is None:
            raise QuestGenerationError("Claude did not return a tool_use block")

        plan = parse_itinerary_json(json.dumps(tool_use.input), ctx)
        tokens = getattr(message.usage, "output_tokens", None)
        return plan, tokens

    async def explain_recommendation(self, ctx: RecommendationExplanationContext) -> tuple[str, int | None]:
        try:
            message = await self._client.messages.create(
                model=self.model,
                max_tokens=100,
                system=EXPLANATION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_explanation_user_prompt(ctx)}],
            )
        except Exception as exc:
            raise QuestGenerationError(f"Anthropic API call failed: {exc}") from exc

        text_block = next((b for b in message.content if b.type == "text"), None)
        if text_block is None:
            raise QuestGenerationError("Claude did not return a text block")

        tokens = getattr(message.usage, "output_tokens", None)
        return clean_explanation(text_block.text), tokens
