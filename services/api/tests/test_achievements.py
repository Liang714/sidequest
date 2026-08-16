"""Achievement unlock engine + analytics event logging — Phase 4.

Exercised through the real HTTP endpoints (not the service function in
isolation) because unlocking depends entirely on quest-completion history
sitting in the DB — same "real integration over isolated mock" stance as
tests/test_quests_e2e.py.
"""

import pytest
from sqlalchemy import select

import app.db as db_module
from app.models.analytics import AnalyticsEvent
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


def _quest_payload(**overrides):
    payload = {
        "title": "Achievement Test Quest",
        "description": "A quest built purely to trip an achievement.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-08-20T12:00:00+00:00",  # midday UTC, well clear of the "night owl" threshold
        "duration_minutes": 60,
        "max_participants": 2,
        "difficulty": "easy",
        "xp_reward": 100,
        "objectives": [],
    }
    payload.update(overrides)
    return payload


async def _create_join_complete(client, tokens, **payload_overrides):
    create = await client.post("/quests", json=_quest_payload(**payload_overrides), headers=auth_headers(tokens))
    assert create.status_code == 201, create.text
    quest_id = create.json()["id"]
    join = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(tokens))
    assert join.status_code == 200, join.text
    complete = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(tokens))
    assert complete.status_code == 200, complete.text
    return complete.json()


async def test_first_quest_and_category_achievement_unlock_together(client, seed_reference_data):
    user = await register(client, email="ach1@example.com", username="ach1")
    result = await _create_join_complete(client, user, category_key="category.photography")

    unlocked_keys = {a["key"] for a in result["new_achievements"]}
    assert unlocked_keys == {"achievement.firstQuest", "achievement.photographer"}
    assert all(a["unlocked"] for a in result["new_achievements"])
    assert result["xp_awarded"] == 100


async def test_food_hunter_achievement_unlocks_for_food_category(client, seed_reference_data):
    user = await register(client, email="ach2@example.com", username="ach2")
    result = await _create_join_complete(client, user, category_key="category.food")

    unlocked_keys = {a["key"] for a in result["new_achievements"]}
    assert "achievement.foodHunter" in unlocked_keys
    assert "achievement.photographer" not in unlocked_keys


async def test_night_owl_achievement_unlocks_for_late_start_time(client, seed_reference_data):
    user = await register(client, email="ach3@example.com", username="ach3")
    result = await _create_join_complete(client, user, start_time="2026-08-20T23:30:00+00:00")

    unlocked_keys = {a["key"] for a in result["new_achievements"]}
    assert "achievement.nightOwl" in unlocked_keys


async def test_explorer_achievement_unlocks_after_five_unique_locations(client, seed_reference_data):
    user = await register(client, email="ach4@example.com", username="ach4")

    for i in range(4):
        result = await _create_join_complete(client, user, title=f"Explorer quest {i}")
        assert "achievement.explorer" not in {a["key"] for a in result["new_achievements"]}

    fifth = await _create_join_complete(client, user, title="Explorer quest 5")
    assert "achievement.explorer" in {a["key"] for a in fifth["new_achievements"]}


async def test_achievement_not_reunlocked_on_subsequent_completion(client, seed_reference_data):
    user = await register(client, email="ach5@example.com", username="ach5")
    first = await _create_join_complete(client, user, title="First")
    assert "achievement.firstQuest" in {a["key"] for a in first["new_achievements"]}

    second = await _create_join_complete(client, user, title="Second")
    assert "achievement.firstQuest" not in {a["key"] for a in second["new_achievements"]}


async def test_level_up_reported_in_complete_response(client, seed_reference_data):
    user = await register(client, email="ach6@example.com", username="ach6")
    # LEVEL_BASE_XP is 500 (app/services/xp_service.py) — 600 XP in one
    # completion crosses the level-1-to-2 threshold in a single call.
    result = await _create_join_complete(client, user, xp_reward=600)
    assert result["new_level"] == 2


async def test_idempotent_repeat_complete_returns_zero_xp_and_no_new_achievements(client, seed_reference_data):
    user = await register(client, email="ach7@example.com", username="ach7")
    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))
    quest_id = create.json()["id"]
    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(user))
    first = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(user))
    assert first.json()["xp_awarded"] == 100

    repeat = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(user))
    assert repeat.status_code == 200
    body = repeat.json()
    assert body["xp_awarded"] == 0
    assert body["new_level"] is None
    assert body["new_achievements"] == []


async def test_locked_achievements_appear_in_gallery_for_new_user(client, seed_reference_data):
    user = await register(client, email="ach8@example.com", username="ach8")
    achievements = (await client.get("/users/me/achievements", headers=auth_headers(user))).json()

    assert len(achievements) == 5  # all seeded achievements, none unlocked yet
    assert all(a["unlocked"] is False and a["unlocked_at"] is None for a in achievements)


async def test_achievement_unlock_logs_analytics_event(client, seed_reference_data):
    user = await register(client, email="ach9@example.com", username="ach9")
    await _create_join_complete(client, user)

    async with db_module.SessionLocal() as session:
        rows = (
            await session.scalars(select(AnalyticsEvent).where(AnalyticsEvent.event_type == "achievement_unlocked"))
        ).all()
    assert len(rows) >= 1
    assert rows[0].payload.get("achievement_key")


async def test_profile_stats_viewed_logs_analytics_event(client, seed_reference_data):
    user = await register(client, email="ach10@example.com", username="ach10")
    await client.get("/users/me/xp", headers=auth_headers(user))

    async with db_module.SessionLocal() as session:
        rows = (
            await session.scalars(
                select(AnalyticsEvent).where(AnalyticsEvent.event_type == "profile_stats_viewed")
            )
        ).all()
    assert len(rows) == 1
