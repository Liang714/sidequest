"""Resolves the configured BookingProvider — mirrors app/ai/service.py and
app/payments/service.py exactly. "fake" is both the dev default *and* the
only implemented provider today (see app/bookings/providers/fake.py's
docstring for why); the env-var-driven selection is kept anyway so
plugging in a real one later is a config change, not a rewrite — same
promise the AI/payments abstractions make."""

from functools import lru_cache

from app.bookings.base import BookingError, BookingProvider
from app.config import get_settings


@lru_cache
def get_booking_provider() -> BookingProvider:
    settings = get_settings()

    if settings.booking_provider != "fake":
        raise BookingError(
            f"BOOKING_PROVIDER={settings.booking_provider!r} has no implementation — "
            "no real booking vendor is wired up yet, see docs/ROADMAP.md Phase 7"
        )

    from app.bookings.providers.fake import FakeBookingProvider

    return FakeBookingProvider()
