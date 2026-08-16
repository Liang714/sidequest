"""Stripe adapter — implemented against the real API, same "written but
unverified against a real key" posture as app/ai/providers/anthropic.py.
No Anthropic-key-shaped secret exists for this either; set
PAYMENT_PROVIDER=stripe + STRIPE_SECRET_KEY (a test-mode `sk_test_...` key
is enough) to actually exercise it.

Deliberately backend-only: real Stripe integrations collect card details
client-side via Stripe.js/Elements and hand the server a PaymentMethod id.
This app has no such client-side integration built (out of scope for a
Phase 6 foundation — see docs/ROADMAP.md), so `charge()` uses Stripe's own
documented test-mode PaymentMethod tokens (`pm_card_visa`) to exercise the
full PaymentIntent create-and-confirm flow from the backend alone. That
only works with a *test* secret key — a live key will reject
`pm_card_visa` outright, which is a feature: this adapter cannot
accidentally move real money without the client-side piece it doesn't
have.
"""

import httpx

from app.payments.base import ChargeResult, PaymentError

_API_BASE = "https://api.stripe.com/v1"
# Currencies Stripe treats as having no fractional unit — amount is passed
# as-is, not multiplied by 100. https://docs.stripe.com/currencies#zero-decimal
_ZERO_DECIMAL_CURRENCIES = {"krw", "jpy", "vnd", "clp", "kmf", "gnf", "bif", "djf", "xaf", "xof", "xpf"}


def _smallest_unit(amount: float, currency: str) -> int:
    if currency.lower() in _ZERO_DECIMAL_CURRENCIES:
        return round(amount)
    return round(amount * 100)


class StripeProvider:
    name = "stripe"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def charge(self, *, amount: float, currency: str, description: str) -> ChargeResult:
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(
                    f"{_API_BASE}/payment_intents",
                    auth=(self._api_key, ""),
                    data={
                        "amount": _smallest_unit(amount, currency),
                        "currency": currency.lower(),
                        "description": description,
                        "payment_method": "pm_card_visa",  # test-mode-only token, see module docstring
                        "confirm": "true",
                        "payment_method_types[]": "card",
                    },
                )
            except httpx.HTTPError as exc:
                raise PaymentError(f"Stripe request failed: {exc}") from exc

        if resp.status_code >= 500:
            raise PaymentError(f"Stripe returned {resp.status_code}: {resp.text}")

        body = resp.json()
        if resp.status_code >= 400:
            # A 4xx here is Stripe declining/rejecting the charge, not our
            # integration being broken — surface it as a failed charge.
            return ChargeResult(provider_ref=body.get("error", {}).get("payment_intent", {}).get("id", "unknown"), status="failed")

        succeeded = body.get("status") == "succeeded"
        return ChargeResult(provider_ref=body["id"], status="succeeded" if succeeded else "failed")
