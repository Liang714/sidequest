"""Provider-agnostic email types. Mirrors app/ai/base.py, app/payments/base.py,
app/bookings/base.py, app/vision/base.py — same abstraction shape, same
reason: no module talks to an email API directly, everything goes through
this Protocol so swapping providers later is a config change, not a
rewrite. See docs/DEPLOYMENT.md for what "fake" vs a real provider means
here specifically.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmailMessage:
    to: str
    subject: str
    text_body: str
    html_body: str


class EmailSendError(Exception):
    """Raised when a provider can't send at all (unreachable, rejected,
    misconfigured) — routers treat this as best-effort/non-fatal
    everywhere it's used (registration/password-reset never fail *because*
    an email didn't go out — see app/routers/auth.py)."""


class EmailProvider(Protocol):
    name: str

    async def send(self, message: EmailMessage) -> None: ...
