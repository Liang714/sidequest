"""XP ledger + level curve.

xp_transactions (append-only) is the source of truth per docs/DATABASE.md;
`award_xp` is the only code path allowed to write to it, and it keeps
Profile.xp/level (the read cache) in sync in the same transaction.

Level curve is intentionally simple and tunable — each level needs a
little more XP than the last (base 500, +250 per level). Not meant to be
final game-design balance, just a real, testable placeholder per the
product spec's "avoid unhealthy/manipulative gamification" constraint
(docs/SECURITY.md): the curve rewards real activity, no artificial
scarcity mechanics layered on top of it.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import XpTransaction
from app.models.identity import Profile

LEVEL_BASE_XP = 500
LEVEL_XP_INCREMENT = 250


@dataclass(frozen=True)
class LevelState:
    level: int
    xp_into_level: int
    xp_for_next_level: int


def compute_level(total_xp: int) -> LevelState:
    level = 1
    remaining = max(total_xp, 0)
    threshold = LEVEL_BASE_XP
    while remaining >= threshold:
        remaining -= threshold
        level += 1
        threshold += LEVEL_XP_INCREMENT
    return LevelState(level=level, xp_into_level=remaining, xp_for_next_level=threshold)


async def award_xp(
    db: AsyncSession,
    *,
    user_id: UUID,
    delta: int,
    reason: str,
    related_quest_id: UUID | None = None,
) -> Profile:
    """Appends an xp_transactions row and resyncs the Profile.xp/level cache
    from the full ledger — recomputing (not incrementing) makes the cache
    self-healing if it ever drifts, and the table stays small at MVP scale.
    """
    db.add(XpTransaction(user_id=user_id, delta=delta, reason=reason, related_quest_id=related_quest_id))
    await db.flush()

    rows = await db.scalars(select(XpTransaction.delta).where(XpTransaction.user_id == user_id))
    total_xp = sum(rows.all())

    level_state = compute_level(total_xp)
    profile = await db.get(Profile, user_id)
    if profile is None:
        # Every user gets a Profile row at registration (see
        # routers/auth.py) — reaching here means that invariant broke.
        raise RuntimeError(f"award_xp: no profile for user {user_id}")
    profile.xp = total_xp
    profile.level = level_state.level
    return profile
