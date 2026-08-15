"""Seeds reference data (categories, interests, achievements) that ships
with the app rather than being user-generated. Keys match
packages/i18n/{en,ko}.json exactly — see docs/ARCHITECTURE.md
§Internationalization: these columns store i18n keys, never display text.

Run: uv run python -m app.seed
"""

import asyncio

from sqlalchemy import select

from app.db import SessionLocal
from app.models.gamification import Achievement
from app.models.identity import Interest
from app.models.quests import QuestCategory

CATEGORIES = [
    ("category.food", "🍜"),
    ("category.cafe", "☕"),
    ("category.gaming", "🎮"),
    ("category.photography", "📸"),
    ("category.dance", "💃"),
    ("category.movies", "🎬"),
    ("category.art", "🎨"),
    ("category.sports", "🏃"),
    ("category.exploration", "🚶"),
    ("category.music", "🎵"),
    ("category.shopping", "🛍️"),
    ("category.random", "🎲"),
]

ACHIEVEMENTS = [
    ("achievement.firstQuest", "🏆", {"quests_completed": 1}),
    ("achievement.nightOwl", "🌙", {"quest_started_after_hour": 21}),
    ("achievement.photographer", "📸", {"category": "photography", "quests_completed": 1}),
    ("achievement.foodHunter", "🍜", {"category": "food", "quests_completed": 1}),
    ("achievement.explorer", "🗺️", {"unique_locations": 5}),
]


async def seed() -> None:
    async with SessionLocal() as db:
        for i, (key, icon) in enumerate(CATEGORIES):
            if await db.scalar(select(QuestCategory).where(QuestCategory.key == key)) is None:
                db.add(QuestCategory(key=key, icon=icon, sort_order=i))
            if await db.scalar(select(Interest).where(Interest.key == key)) is None:
                db.add(Interest(key=key, category=key.split(".")[1]))

        for key, icon, criteria in ACHIEVEMENTS:
            if await db.scalar(select(Achievement).where(Achievement.key == key)) is None:
                db.add(Achievement(key=key, icon=icon, criteria=criteria))

        await db.commit()
    print(f"Seeded {len(CATEGORIES)} categories/interests and {len(ACHIEVEMENTS)} achievements.")


if __name__ == "__main__":
    asyncio.run(seed())
