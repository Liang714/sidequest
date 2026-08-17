"""Resolves the configured VisionVerifier — mirrors app/ai/service.py and
app/bookings/service.py exactly. "ollama" (llava:7b, local, free) is the
dev default. "fake" (app/vision/providers/fake.py) is the production-safe
default for a hosted deployment where Ollama isn't reachable — see
docs/DEPLOYMENT.md. Claude also supports vision, but adding an untested
speculative AnthropicVisionProvider wouldn't add real value the way
app/payments/providers/stripe.py's test-mode trick did."""

from functools import lru_cache

from app.config import get_settings
from app.vision.base import VisionVerificationError, VisionVerifier


@lru_cache
def get_vision_verifier() -> VisionVerifier:
    settings = get_settings()

    if settings.vision_provider == "fake":
        from app.vision.providers.fake import FakeVisionProvider

        return FakeVisionProvider()

    if settings.vision_provider != "ollama":
        raise VisionVerificationError(
            f"VISION_PROVIDER={settings.vision_provider!r} has no implementation — "
            "only 'ollama' (llava) and 'fake' exist today, see docs/ROADMAP.md Phase 8"
        )

    from app.vision.providers.ollama_vision import OllamaVisionProvider

    return OllamaVisionProvider(host=settings.ollama_host, model=settings.ollama_vision_model)
