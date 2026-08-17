"""Fake VisionVerifier — the production-safe default when no local Ollama
vision model is reachable from this deployment (see docs/DEPLOYMENT.md).
Always returns a low-confidence "not actually reviewed" result instead of
fabricating a verdict — consistent with VisionVerifier being advisory-only
everywhere (see docs/AI.md §Vision verification): verify-photo still
completes the objective either way, this just avoids pretending a real
review happened when it didn't.
"""

from app.vision.base import VisionVerificationResult

DEMO_EXPLANATION = (
    "AI photo verification is running in demo mode for this deployment "
    "(no live vision model configured) — this photo wasn't actually "
    "reviewed. The objective is still marked complete."
)


class FakeVisionProvider:
    name = "fake"

    async def verify(self, *, image_bytes: bytes, objective_description: str) -> VisionVerificationResult:
        return VisionVerificationResult(matches=False, confidence=0.0, explanation=DEMO_EXPLANATION)
