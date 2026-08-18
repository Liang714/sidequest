"""Dev/test default — no real email sent. Mirrors app/payments/providers/fake.py's
posture exactly: production-grade abstraction, $0 to develop against.
Logs the *full* message (including any verification/reset link/token in
the body), so local dev can actually complete the email verification /
password reset flows end to end by reading the API log — same idea as
scripts/measure_vision_accuracy.py favoring something you can actually
verify over something that just silently no-ops.

Logged at WARNING, not INFO — found live: uvicorn's default logging
config doesn't surface plain INFO-level app loggers (root logger effective
level is WARNING unless something configures otherwise), so an .info()
call here would silently vanish, defeating the entire point of this
class. WARNING isn't semantically perfect for "this is normal," but
reliably showing up is what actually matters here.
"""

import logging

from app.email.base import EmailMessage

logger = logging.getLogger("app.email.fake")


class FakeEmailProvider:
    name = "fake"

    async def send(self, message: EmailMessage) -> None:
        logger.warning(
            "FAKE EMAIL (no real provider configured — see EMAIL_PROVIDER in .env.example)\n"
            "  to: %s\n  subject: %s\n  ---\n%s\n  ---",
            message.to,
            message.subject,
            message.text_body,
        )
