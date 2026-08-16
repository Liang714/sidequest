"""Claude provider — the documented production target (docs/AI.md). Needs
ANTHROPIC_API_KEY; see app/config.py. Uses tool use (forced tool_choice)
for structured output rather than prompting for JSON and hoping — the
current recommended way to get reliable structured output from Claude,
and it means no regex/repair parsing here unlike the Ollama provider.
"""

import json

from anthropic import AsyncAnthropic

from app.ai.base import GeneratedQuest, QuestGenerationContext, QuestGenerationError
from app.ai.prompt import SYSTEM_PROMPT, build_user_prompt, parse_quest_json

_TOOL_NAME = "create_quest_draft"

_TOOL_SCHEMA = {
    "name": _TOOL_NAME,
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
                tools=[_TOOL_SCHEMA],
                tool_choice={"type": "tool", "name": _TOOL_NAME},
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
