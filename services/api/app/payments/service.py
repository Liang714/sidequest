"""Resolves the configured PaymentProvider — the one place that reads
settings.payment_provider, mirroring app/ai/service.py exactly. "fake" (no
real money, always succeeds) is the dev/test default; set
PAYMENT_PROVIDER=stripe|toss + the matching secret key to use a real
provider instead — see app/payments/providers/stripe.py and toss.py for
what "real" actually means for each today."""

from functools import lru_cache

from app.config import get_settings
from app.payments.base import PaymentError, PaymentProvider


@lru_cache
def get_payment_provider() -> PaymentProvider:
    settings = get_settings()

    if settings.payment_provider == "stripe":
        if not settings.stripe_secret_key:
            raise PaymentError("PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not set — see .env.example")
        from app.payments.providers.stripe import StripeProvider

        return StripeProvider(api_key=settings.stripe_secret_key)

    if settings.payment_provider == "toss":
        if not settings.toss_secret_key:
            raise PaymentError("PAYMENT_PROVIDER=toss but TOSS_SECRET_KEY is not set — see .env.example")
        from app.payments.providers.toss import TossProvider

        return TossProvider(secret_key=settings.toss_secret_key)

    from app.payments.providers.fake import FakeProvider

    return FakeProvider()
