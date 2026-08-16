"""Local Ollama provider — the dev default (see docs/AI.md and
app/config.py). Free, self-hosted, no API key. Swap to AnthropicProvider
in production by setting AI_PROVIDER=anthropic; nothing else changes."""

import httpx

from app.ai.base import GeneratedQuest, QuestGenerationContext, QuestGenerationError
from app.ai.prompt import SYSTEM_PROMPT, build_user_prompt, parse_quest_json


class OllamaProvider:
    name = "ollama"

    def __init__(self, host: str, model: str) -> None:
        self.host = host.rstrip("/")
        self.model = model

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        payload = {
            "model": self.model,
            "system": SYSTEM_PROMPT,
            "prompt": build_user_prompt(ctx),
            "format": "json",
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{self.host}/api/generate", json=payload)
                resp.raise_for_status()
                body = resp.json()
        except httpx.HTTPError as exc:
            raise QuestGenerationError(f"Ollama unreachable at {self.host}: {exc}") from exc

        raw = body.get("response", "")
        quest = parse_quest_json(raw, ctx)
        tokens = body.get("eval_count")
        return quest, tokens if isinstance(tokens, int) else None
