"""Resend (resend.com) — a real transactional email provider, not a
speculative one: their REST API is a single POST, no SDK needed (httpx is
already a dependency everywhere else in this app), and their free tier
(3,000 emails/month, 100/day as of writing) is enough for real early
usage at $0. Picked over the older incumbents (SendGrid, Postmark) for
the same "current best fit, not just *a* fit" reasoning docs/ARCHITECTURE.md
already applies elsewhere (Valkey over Redis, MapLibre over Mapbox GL) —
Resend is the modern default for exactly this kind of app today.

Needs a real Resend account + API key to actually send (see
docs/DEPLOYMENT.md) — until then EMAIL_PROVIDER stays "fake". Sending
`from` an unverified domain only delivers to the Resend account's own
verified address (their sandbox restriction) — real delivery to
arbitrary user addresses needs a verified sending domain.
"""

import httpx

from app.email.base import EmailMessage, EmailSendError


class ResendProvider:
    name = "resend"

    def __init__(self, api_key: str, from_address: str) -> None:
        self.api_key = api_key
        self.from_address = from_address

    async def send(self, message: EmailMessage) -> None:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "from": self.from_address,
                        "to": [message.to],
                        "subject": message.subject,
                        "html": message.html_body,
                        "text": message.text_body,
                    },
                )
                resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            # httpx's default str(exc) is just "Client error '422 ...' for
            # url '...'" — it drops the response body, which is exactly
            # where Resend puts the actually-useful validation/permission
            # message. Caught live (2026-08-18): the caller's log line was
            # truncated right where the real answer would've been.
            raise EmailSendError(f"Resend send failed ({exc.response.status_code}): {exc.response.text}") from exc
        except httpx.HTTPError as exc:
            raise EmailSendError(f"Resend send failed: {exc}") from exc
