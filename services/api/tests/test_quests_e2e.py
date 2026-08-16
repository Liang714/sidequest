import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


def _quest_payload(**overrides):
    payload = {
        "title": "Hongdae Photo Hunt",
        "description": "Chase neon signs across Hongdae.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-08-20T20:00:00+09:00",
        "duration_minutes": 120,
        "budget_amount": 15000,
        "max_participants": 2,
        "difficulty": "medium",
        "xp_reward": 250,
        "objectives": [{"description": "Find a neon sign"}, {"description": "Group photo"}],
    }
    payload.update(overrides)
    return payload


async def test_two_users_create_discover_join_complete_and_earn_xp(client, seed_reference_data):
    """The Phase 2 MVP exit criteria, codified: two real users can create,
    discover, join, and complete a SideQuest together — see docs/PRD.md
    §5 and docs/ROADMAP.md Phase 2.
    """
    erh = await register(client, email="erh@example.com", username="erh")
    alex = await register(client, email="alex@example.com", username="alex")

    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(erh))
    assert create.status_code == 201, create.text
    quest = create.json()
    quest_id = quest["id"]
    obj_ids = [o["id"] for o in quest["objectives"]]
    assert len(obj_ids) == 2

    # discovery: nearby search from ~the same spot finds it
    nearby = await client.get(
        "/quests/nearby", params={"lat": 37.5563, "lng": 126.9236, "radius_km": 5}, headers=auth_headers(alex)
    )
    assert nearby.status_code == 200
    assert any(q["id"] == quest_id for q in nearby.json())

    # both join
    for tokens in (erh, alex):
        join = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(tokens))
        assert join.status_code == 200, join.text
    full_state = (await client.get(f"/quests/{quest_id}", headers=auth_headers(erh))).json()
    assert full_state["joined_count"] == 2
    assert full_state["status"] == "full"  # max_participants=2, both joined

    # a third user can't join a full quest
    chris = await register(client, email="chris@example.com", username="chris")
    third = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(chris))
    assert third.status_code == 409

    # both complete both objectives, check in, and complete the quest
    for tokens in (erh, alex):
        for obj_id in obj_ids:
            resp = await client.post(
                f"/quests/{quest_id}/objectives/{obj_id}/complete", headers=auth_headers(tokens)
            )
            assert resp.status_code == 200
        checkin = await client.post(f"/quests/{quest_id}/checkin", headers=auth_headers(tokens))
        assert checkin.status_code == 200

    for tokens in (erh, alex):
        complete = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(tokens))
        assert complete.status_code == 200

    final = (await client.get(f"/quests/{quest_id}", headers=auth_headers(erh))).json()
    assert final["status"] == "completed"

    for tokens in (erh, alex):
        xp = (await client.get("/users/me/xp", headers=auth_headers(tokens))).json()
        assert xp["xp"] == 250
        achievements = (await client.get("/users/me/achievements", headers=auth_headers(tokens))).json()
        assert any(a["key"] == "achievement.firstQuest" for a in achievements)


async def test_completion_blocked_until_required_objectives_done(client, seed_reference_data):
    erh = await register(client, email="erh2@example.com", username="erh2")
    create = await client.post("/quests", json=_quest_payload(max_participants=4), headers=auth_headers(erh))
    quest_id = create.json()["id"]

    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(erh))
    resp = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(erh))
    assert resp.status_code == 409


async def test_cannot_join_same_quest_twice(client, seed_reference_data):
    erh = await register(client, email="erh3@example.com", username="erh3")
    create = await client.post("/quests", json=_quest_payload(max_participants=4), headers=auth_headers(erh))
    quest_id = create.json()["id"]

    first = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(erh))
    assert first.status_code == 200
    second = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(erh))
    assert second.status_code == 409


async def test_leave_then_rejoin(client, seed_reference_data):
    erh = await register(client, email="erh4@example.com", username="erh4")
    create = await client.post("/quests", json=_quest_payload(max_participants=4), headers=auth_headers(erh))
    quest_id = create.json()["id"]

    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(erh))
    leave = await client.post(f"/quests/{quest_id}/leave", headers=auth_headers(erh))
    assert leave.status_code == 200
    assert leave.json()["joined_count"] == 0

    rejoin = await client.post(f"/quests/{quest_id}/join", headers=auth_headers(erh))
    assert rejoin.status_code == 200
    assert rejoin.json()["joined_count"] == 1


async def test_only_creator_can_edit_or_delete(client, seed_reference_data):
    erh = await register(client, email="erh5@example.com", username="erh5")
    alex = await register(client, email="alex5@example.com", username="alex5")
    create = await client.post("/quests", json=_quest_payload(max_participants=4), headers=auth_headers(erh))
    quest_id = create.json()["id"]

    edit = await client.patch(f"/quests/{quest_id}", json={"title": "Hacked"}, headers=auth_headers(alex))
    assert edit.status_code == 403

    delete = await client.delete(f"/quests/{quest_id}", headers=auth_headers(alex))
    assert delete.status_code == 403


async def test_unknown_category_rejected(client, seed_reference_data):
    erh = await register(client, email="erh6@example.com", username="erh6")
    resp = await client.post(
        "/quests", json=_quest_payload(category_key="category.does-not-exist"), headers=auth_headers(erh)
    )
    assert resp.status_code == 400


async def test_my_quests_includes_created_and_joined_but_not_left(client, seed_reference_data):
    erh = await register(client, email="erh7@example.com", username="erh7")
    alex = await register(client, email="alex7@example.com", username="alex7")

    created = await client.post("/quests", json=_quest_payload(max_participants=4), headers=auth_headers(erh))
    created_id = created.json()["id"]

    joined = await client.post(
        "/quests", json=_quest_payload(title="Joined Quest", max_participants=4), headers=auth_headers(erh)
    )
    joined_id = joined.json()["id"]
    await client.post(f"/quests/{joined_id}/join", headers=auth_headers(alex))

    left = await client.post(
        "/quests", json=_quest_payload(title="Left Quest", max_participants=4), headers=auth_headers(erh)
    )
    left_id = left.json()["id"]
    await client.post(f"/quests/{left_id}/join", headers=auth_headers(alex))
    await client.post(f"/quests/{left_id}/leave", headers=auth_headers(alex))

    mine = (await client.get("/quests/mine", headers=auth_headers(alex))).json()
    mine_ids = {q["id"] for q in mine}
    assert joined_id in mine_ids
    assert left_id not in mine_ids
    assert created_id not in mine_ids  # alex didn't create or join this one

    erh_mine = {q["id"] for q in (await client.get("/quests/mine", headers=auth_headers(erh))).json()}
    assert {created_id, joined_id, left_id} <= erh_mine  # erh created all three
