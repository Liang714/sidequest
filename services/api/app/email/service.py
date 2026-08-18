"""Resolves the configured EmailProvider — mirrors app/ai/service.py and
every other provider factory in this app exactly. "fake" (logs instead of
sending, see app/email/providers/fake.py) is the dev/test default AND
the production-safe default for a fresh deploy with no email account set
up yet — same posture as AI_PROVIDER=fake, PAYMENT_PROVIDER=fake before
real keys are added. See docs/DEPLOYMENT.md.
"""

from functools import lru_cache

from app.config import get_settings
from app.email.base import EmailProvider, EmailSendError


@lru_cache
def get_email_provider() -> EmailProvider:
    settings = get_settings()

    if settings.email_provider == "resend":
        if not settings.resend_api_key:
            raise EmailSendError("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set — see .env.example")
        from app.email.providers.resend import ResendProvider

        return ResendProvider(api_key=settings.resend_api_key, from_address=settings.email_from_address)

    from app.email.providers.fake import FakeEmailProvider

    return FakeEmailProvider()
