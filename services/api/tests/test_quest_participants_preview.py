"""Discovery cards lead with who's going, so list endpoints must carry faces."""

import pytest

from app.deps import get_valkey
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


async def _clear_rate_limits():
    vk = await get_valkey()
    async for key in vk.scan_iter(match="ratelimit:*"):
        await vk.delete(key)


def _quest_payload(**overrides):
    payload = {
        "title": "Hongdae Photo Hunt",
        "description": "Chase neon signs across Hongdae.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-08-20T20:00:00+09:00",
        "duration_minutes": 120,
        "budget_amount": 15000,
        "max_participants": 10,
        "difficulty": "medium",
        "xp_reward": 250,
        "objectives": [{"description": "Find a neon sign"}],
    }
    payload.update(overrides)
    return payload


async def test_summary_includes_participant_previews(client, seed_reference_data):
    host = await register(client, email="host_pp@example.com", username="host_pp")
    joiner = await register(client, email="join_pp@example.com", username="join_pp")

    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(host))).json()
    await client.post(f"/quests/{quest['id']}/join", headers=auth_headers(joiner))

    listed = (await client.get("/quests", headers=auth_headers(joiner))).json()
    row = next(q for q in listed if q["id"] == quest["id"])

    assert row["participants"], "a joined quest must expose at least one face"
    # Identity-only: nothing appearance-adjacent may leak onto a discovery card.
    for p in row["participants"]:
        assert set(p) == {"user_id", "display_name", "avatar_url"}


async def test_preview_is_capped_but_count_is_not(client, seed_reference_data):
    """A card shows at most four faces; joined_count still tells the truth."""
    host = await register(client, email="host_cap@example.com", username="host_cap")
    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(host))).json()

    for i in range(6):
        # register is rate-limited 5/min/IP and httpx's ASGITransport gives
        # every request the same fake client address, so six signups in one
        # test would 429 on their own. conftest clears these between tests;
        # this test needs it cleared within one.
        await _clear_rate_limits()
        u = await register(client, email=f"cap{i}@example.com", username=f"cap{i}")
        await client.post(f"/quests/{quest['id']}/join", headers=auth_headers(u))

    listed = (await client.get("/quests", headers=auth_headers(host))).json()
    row = next(q for q in listed if q["id"] == quest["id"])
    assert len(row["participants"]) <= 4
    assert row["joined_count"] >= 6
