"""Resolves the configured AIProvider — the one place that reads
settings.ai_provider, so routers/tests never import a specific provider
directly. Exposed as a FastAPI dependency so tests can override it with a
fake provider instead of hitting a real LLM (see tests/test_ai.py)."""

from functools import lru_cache

from app.ai.base import AIProvider, QuestGenerationError
from app.config import get_settings


@lru_cache
def get_ai_provider() -> AIProvider:
    settings = get_settings()

    if settings.ai_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise QuestGenerationError(
                "AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set — see .env.example"
            )
        from app.ai.providers.anthropic import AnthropicProvider

        return AnthropicProvider(api_key=settings.anthropic_api_key, model=settings.anthropic_model)

    from app.ai.providers.ollama import OllamaProvider

    return OllamaProvider(host=settings.ollama_host, model=settings.ollama_model)
