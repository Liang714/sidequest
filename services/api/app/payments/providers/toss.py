"""Toss Payments adapter — implemented against the real confirm API, but
genuinely can't satisfy the single-call `PaymentProvider.charge()` contract
the way app/payments/providers/stripe.py's test-mode trick can.

Toss (like every Korean PG) requires card details to be entered through
its client-side checkout widget for PCI reasons — there's no server-only
"charge this card" API at all, test mode or not. The real flow is:
  1. client redirects to Toss's widget, user pays, Toss redirects back
     with `paymentKey` + `orderId` + `amount` query params
  2. server calls `confirm_payment()` below with those three values to
     finalize the charge

Step 1 (the widget + redirect handling in apps/web) isn't built — that's
real frontend work, not a backend stub. So `charge()` raises `PaymentError`
explaining exactly that, rather than pretending a fire-and-forget charge
is possible. `confirm_payment()` is real, correct, and ready for whenever
that frontend piece exists; it just isn't reachable through the uniform
`PaymentProvider` protocol today. See docs/ARCHITECTURE.md.
"""

import httpx

from app.payments.base import ChargeResult, PaymentError

_API_BASE = "https://api.tosspayments.com/v1"


class TossProvider:
    name = "toss"

    def __init__(self, secret_key: str) -> None:
        self._secret_key = secret_key

    async def charge(self, *, amount: float, currency: str, description: str) -> ChargeResult:
        raise PaymentError(
            "Toss Payments has no server-only charge API — it requires the client-side "
            "checkout widget (see this module's docstring). Use confirm_payment() once "
            "apps/web has the widget + redirect flow wired up."
        )

    async def confirm_payment(self, *, payment_key: str, order_id: str, amount: int) -> ChargeResult:
        """The real second half of a Toss payment — call this from the
        redirect handler once the widget flow exists. `amount` is a plain
        integer KRW amount (Toss doesn't use Stripe's smallest-unit
        convention — KRW has no subunit anyway)."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(
                    f"{_API_BASE}/payments/confirm",
                    auth=(self._secret_key, ""),
                    json={"paymentKey": payment_key, "orderId": order_id, "amount": amount},
                )
            except httpx.HTTPError as exc:
                raise PaymentError(f"Toss request failed: {exc}") from exc

        if resp.status_code >= 500:
            raise PaymentError(f"Toss returned {resp.status_code}: {resp.text}")

        body = resp.json()
        if resp.status_code >= 400:
            return ChargeResult(provider_ref=payment_key, status="failed")

        succeeded = body.get("status") in ("DONE", "PARTIAL_CANCELED")
        return ChargeResult(provider_ref=body.get("paymentKey", payment_key), status="succeeded" if succeeded else "failed")
