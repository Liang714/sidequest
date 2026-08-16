"""Provider-agnostic booking types. Mirrors app/ai/base.py and
app/payments/base.py on purpose — same abstraction shape, same reason:
one interface, swappable providers, no call-site changes when a real one
lands. See docs/ROADMAP.md Phase 7 for why no real provider is wired in
yet (none was ever named in Phase 0 — see app/bookings/providers/fake.py).
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal, Protocol

BookingStatus = Literal["confirmed", "failed"]


@dataclass(frozen=True)
class AvailabilitySlot:
    slot_ref: str  # opaque id the provider needs to actually book this slot
    start_time: datetime
    capacity: int
    price_amount: float
    currency: str


@dataclass(frozen=True)
class BookingResult:
    provider_booking_ref: str
    status: BookingStatus
    # The provider's own confirmed price — the source of truth for what
    # gets charged, not whatever the client last saw in an availability
    # response (prices can move between a quote and a booking, and this
    # closes off a trivial price-tampering vector: the client never gets
    # to just assert an amount). See app/routers/bookings.py.
    price_amount: float
    currency: str


class BookingError(Exception):
    """Raised when a provider can't even attempt a booking (misconfigured,
    unreachable, unknown slot) — routers turn this into a 502, never a raw
    500. A *declined* booking is not this — that's BookingResult(status="failed")."""


class BookingProvider(Protocol):
    name: str

    async def check_availability(
        self, *, activity_key: str, on_date: date, party_size: int
    ) -> list[AvailabilitySlot]:
        """activity_key is a free-form catalog key (e.g. "bowling",
        "karaoke", "restaurant_table") — there's no fixed activity catalog
        in this foundation; a real provider would validate it against
        its own inventory."""
        ...

    async def book(self, *, slot_ref: str, party_size: int, description: str) -> BookingResult:
        ...
