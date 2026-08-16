"""Provider-agnostic payment types. See docs/ARCHITECTURE.md — PaymentService
resolves one of these providers; no other module talks to Stripe/Toss
directly. Mirrors app/ai/base.py's shape on purpose (same abstraction
pattern, same reason: swap the provider via one env var, no call-site
changes).
"""

from dataclasses import dataclass
from typing import Literal, Protocol

ChargeStatus = Literal["succeeded", "failed"]


@dataclass(frozen=True)
class ChargeResult:
    provider_ref: str
    status: ChargeStatus


class PaymentError(Exception):
    """Raised when a provider can't even attempt a charge (misconfigured,
    unreachable) — routers turn this into a 502, never a raw 500. A
    *declined* charge is not this — that's ChargeResult(status="failed")."""


class PaymentProvider(Protocol):
    name: str

    async def charge(self, *, amount: float, currency: str, description: str) -> ChargeResult:
        """One-shot charge — no saved payment methods, no subscriptions
        API, no refunds. Every commerce flow in this app (Pro subscription,
        AI credit packs, marketplace purchases) is a single charge; see
        app/routers/subscriptions.py, ai.py, creators.py for how each
        turns a successful charge into a Payment + whatever it unlocks."""
        ...
