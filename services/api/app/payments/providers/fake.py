"""Dev/test default — no real money moves. Mirrors app/ai/providers'
Ollama-as-free-default posture: production-grade abstraction, $0 to
develop against. See app/payments/service.py for provider selection."""

import uuid

from app.payments.base import ChargeResult


class FakeProvider:
    name = "fake"

    async def charge(self, *, amount: float, currency: str, description: str) -> ChargeResult:
        return ChargeResult(provider_ref=f"fake_{uuid.uuid4().hex[:20]}", status="succeeded")
