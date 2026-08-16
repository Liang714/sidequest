"""Achievement unlock engine.

Evaluates every seeded `Achievement.criteria` (see app/seed.py) against a
user's full completed-quest history and unlocks whatever newly qualifies.
Runs after quest completion (the only event that can change any of these
stats) — see routers/quests.py::complete_quest.

Criteria shapes currently seeded, and how each is read:
    {"quests_completed": N}                      -> total completed quests >= N
    {"category": "food", "quests_completed": N}   -> completed quests in that category >= N
    {"quest_started_after_hour": H}               -> any completed quest started at hour >= H (UTC)
    {"unique_locations": N}                       -> distinct quest locations completed >= N

This is a small, explicit dispatch rather than a generic rules DSL —
five criteria shapes don't earn an interpreter yet. If a new shape shows
up, add one more `if` branch here; see docs/SECURITY.md §Healthy
engagement before adding anything streak- or urgency-based.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import Achievement, UserAchievement
from app.models.quests import Quest, QuestCategory, QuestCompletion
from app.services import analytics_service


@dataclass(frozen=True)
class _CompletionStats:
    total_completed: int
    completed_by_category: dict[str, int] = field(default_factory=dict)
    late_night_completed: bool = False
    unique_location_count: int = 0


async def _load_stats(db: AsyncSession, user_id: UUID) -> _CompletionStats:
    rows = await db.execute(
        select(Quest.category_id, QuestCategory.key, Quest.start_time, Quest.location_id)
        .join(QuestCompletion, QuestCompletion.quest_id == Quest.id)
        .join(QuestCategory, QuestCategory.id == Quest.category_id)
        .where(QuestCompletion.user_id == user_id)
    )
    by_category: dict[str, int] = {}
    late_night = False
    location_ids: set[UUID] = set()
    total = 0
    for _category_id, category_key, start_time, location_id in rows.all():
        total += 1
        short_key = category_key.split(".")[-1]  # "category.food" -> "food"
        by_category[short_key] = by_category.get(short_key, 0) + 1
        if start_time.hour >= 21:
            late_night = True
        location_ids.add(location_id)

    return _CompletionStats(
        total_completed=total,
        completed_by_category=by_category,
        late_night_completed=late_night,
        unique_location_count=len(location_ids),
    )


def _criteria_met(criteria: dict[str, Any], stats: _CompletionStats) -> bool:
    if "category" in criteria:
        return stats.completed_by_category.get(criteria["category"], 0) >= int(criteria.get("quests_completed", 1))
    if "quests_completed" in criteria:
        return stats.total_completed >= int(criteria["quests_completed"])
    if "quest_started_after_hour" in criteria:
        return stats.late_night_completed
    if "unique_locations" in criteria:
        return stats.unique_location_count >= int(criteria["unique_locations"])
    return False


async def evaluate_and_unlock_achievements(db: AsyncSession, user_id: UUID) -> list[tuple[Achievement, datetime]]:
    """Unlocks any achievement the user newly qualifies for. Returns
    (achievement, unlocked_at) pairs for whatever's newly unlocked (empty
    if none) so callers (the complete-quest endpoint) can surface them to
    the client. Does not commit — caller's transaction does, same
    convention as xp_service.award_xp."""
    already_unlocked_ids = set(
        (await db.scalars(select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id))).all()
    )
    all_achievements = (await db.scalars(select(Achievement))).all()
    locked = [a for a in all_achievements if a.id not in already_unlocked_ids]
    if not locked:
        return []

    stats = await _load_stats(db, user_id)
    newly_unlocked: list[tuple[Achievement, datetime]] = []
    for achievement in locked:
        if _criteria_met(achievement.criteria, stats):
            now = datetime.now(UTC)
            db.add(UserAchievement(user_id=user_id, achievement_id=achievement.id, unlocked_at=now))
            analytics_service.log_event(
                db, event_type="achievement_unlocked", user_id=user_id, payload={"achievement_key": achievement.key}
            )
            newly_unlocked.append((achievement, now))

    return newly_unlocked
