import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio

SEOUL = {"lat": 37.5665, "lng": 126.9780}


def _quest_payload(**overrides):
    payload = {
        "title": "Recs Test Quest",
        "description": "For recommendation/compatibility tests.",
        "category_key": "category.photography",
        "location": {"lat": SEOUL["lat"], "lng": SEOUL["lng"], "city": "Seoul", "country": "KR"},
        "start_time": "2026-12-01T20:00:00+09:00",
        "duration_minutes": 90,
        "max_participants": 4,
        "difficulty": "medium",
        "xp_reward": 250,
        "objectives": [{"description": "Do the thing"}],
    }
    payload.update(overrides)
    return payload


async def test_compatibility_endpoint_returns_score_and_breakdown(client, seed_reference_data):
    erh = await register(client, email="rec1@example.com", username="rec1")
    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(erh))
    quest_id = create.json()["id"]

    resp = await client.get(
        f"/quests/{quest_id}/compatibility",
        params={"lat": SEOUL["lat"], "lng": SEOUL["lng"]},
        headers=auth_headers(erh),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert 0 <= body["score"] <= 100
    assert len(body["breakdown"]) == 3
    assert sum(b["points"] for b in body["breakdown"]) == body["score"]


async def test_compatibility_is_higher_with_matching_interest(client, seed_reference_data):
    erh = await register(client, email="rec2@example.com", username="rec2")
    create = await client.post(
        "/quests", json=_quest_payload(category_key="category.photography"), headers=auth_headers(erh)
    )
    quest_id = create.json()["id"]

    without_interest = (
        await client.get(f"/quests/{quest_id}/compatibility", headers=auth_headers(erh))
    ).json()["score"]

    interests = (await client.get("/interests")).json()
    photo_interest = next(i for i in interests if i["key"] == "category.photography")
    await client.put(
        "/users/me/interests", json={"interest_ids": [photo_interest["id"]]}, headers=auth_headers(erh)
    )

    with_interest = (
        await client.get(f"/quests/{quest_id}/compatibility", headers=auth_headers(erh))
    ).json()["score"]

    assert with_interest > without_interest


async def test_recommended_ranks_matching_interest_first(client, seed_reference_data):
    erh = await register(client, email="rec3@example.com", username="rec3")

    # Only category.photography has a seeded Interest row (see
    # conftest.py's seed_reference_data) — category.dance exists as a
    # QuestCategory for quest creation but isn't a selectable interest,
    # so it's the deliberate "non-matching" category here.
    interests = (await client.get("/interests")).json()
    photo_interest = next(i for i in interests if i["key"] == "category.photography")
    await client.put(
        "/users/me/interests", json={"interest_ids": [photo_interest["id"]]}, headers=auth_headers(erh)
    )

    matching = await client.post(
        "/quests",
        json=_quest_payload(title="Photo Quest", category_key="category.photography"),
        headers=auth_headers(erh),
    )
    other = await client.post(
        "/quests",
        json=_quest_payload(title="Dance Quest", category_key="category.dance"),
        headers=auth_headers(erh),
    )
    matching_id, other_id = matching.json()["id"], other.json()["id"]

    resp = await client.get(
        "/quests/recommended", params={"lat": SEOUL["lat"], "lng": SEOUL["lng"]}, headers=auth_headers(erh)
    )
    assert resp.status_code == 200, resp.text
    ids = [q["id"] for q in resp.json()]
    assert matching_id in ids and other_id in ids
    assert ids.index(matching_id) < ids.index(other_id)
