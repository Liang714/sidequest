"""Dev/test default — and, for bookings, the *only* provider today; no
real vendor was ever named in Phase 0 (see docs/ROADMAP.md Phase 7). It's
stateless on purpose: `slot_ref` encodes everything `book()` needs
(activity, time, price) instead of caching slots server-side, so it works
identically across restarts/workers with zero shared state — the same
property a real provider's opaque slot ids would have from our side.
"""

import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal

from app.bookings.base import AvailabilitySlot, BookingError, BookingResult

_SLOT_HOURS = (11, 13, 15, 19)
_BASE_PRICE = Decimal(15000)


def _price_for(activity_key: str, hour: int) -> float:
    # Deterministic-but-varied fake pricing — no real catalog to price from.
    variance = (sum(activity_key.encode()) % 5) * 1000
    evening_premium = 5000 if hour >= 18 else 0
    return float(_BASE_PRICE + variance + evening_premium)


class FakeBookingProvider:
    name = "fake"

    async def check_availability(
        self, *, activity_key: str, on_date: date, party_size: int
    ) -> list[AvailabilitySlot]:
        slots = []
        for hour in _SLOT_HOURS:
            price = _price_for(activity_key, hour)
            start = datetime.combine(on_date, time(hour=hour), tzinfo=UTC)
            slots.append(
                AvailabilitySlot(
                    slot_ref=f"{activity_key}|{start.isoformat()}|{price}",
                    start_time=start,
                    capacity=max(party_size, 2),
                    price_amount=price,
                    currency="KRW",
                )
            )
        return slots

    async def book(self, *, slot_ref: str, party_size: int, description: str) -> BookingResult:
        # The price comes back out of slot_ref (see check_availability) —
        # never trust a client-supplied amount for what to charge.
        try:
            _activity_key, _start_iso, price_str = slot_ref.split("|", 2)
            price = float(price_str)
        except ValueError as exc:
            raise BookingError(f"Unrecognized slot_ref: {slot_ref!r}") from exc

        return BookingResult(
            provider_booking_ref=f"fake_booking_{uuid.uuid4().hex[:20]}",
            status="confirmed",
            price_amount=price,
            currency="KRW",
        )
