"""Provider-agnostic vision-verification types. Mirrors app/ai/base.py and
app/payments/base.py — same abstraction shape. See docs/ROADMAP.md Phase 8:
VisionVerifier confirms a photo objective (e.g. "find a red vending
machine") actually shows what it claims, instead of running purely on the
honor system.

Per the measured accuracy in services/api/scripts/measure_vision_accuracy.py
(see its output in docs/AI.md §VisionVerifier), this does NOT gate XP
awards — it's advisory only. See app/routers/quests.py's objective-
completion endpoint for exactly what that means.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class VisionVerificationResult:
    matches: bool
    confidence: float  # 0.0-1.0, the model's own self-reported confidence
    explanation: str


class VisionVerificationError(Exception):
    """Raised when a provider can't even attempt verification (unreachable,
    malformed output survives retries) — routers turn this into a 502."""


class VisionVerifier(Protocol):
    name: str

    async def verify(self, *, image_bytes: bytes, objective_description: str) -> VisionVerificationResult: ...
