"""Public profile — the screen that makes the app's social half reachable.

Until GET /users/{id} was surfaced there was no way for the UI to obtain
another user's id, so POST /friends/request (a Must story) could not be
reached at all. These tests pin the parts that are security-relevant:
blocks hide both directions, and the friends-only setting actually
restricts.
"""

import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


async def _user_id(client, token):
    return (await client.get("/auth/me", headers=auth_headers(token))).json()["user_id"]


async def test_public_profile_returns_vetting_data(client):
    erh = await register(client, email="erh_pp@example.com", username="erh_pp")
    alex = await register(client, email="alex_pp@example.com", username="alex_pp")
    alex_id = await _user_id(client, alex)

    resp = await client.get(f"/users/{alex_id}", headers=auth_headers(erh))
    assert resp.status_code == 200
    body = resp.json()

    assert body["username"] == "alex_pp"
    assert body["restricted"] is False
    assert body["is_friend"] is False
    assert body["friend_request_pending"] is False
    # Behaviour/graph derived, present even when zero.
    for key in ("interests", "completed_quests", "achievements_unlocked", "shared_quests", "mutual_friends"):
        assert key in body

    # PRD.md §6: no appearance-oriented field exists on this payload at all.
    for forbidden in ("birth_date", "age", "last_seen", "profile_views", "photos"):
        assert forbidden not in body


async def test_friend_state_is_reflected(client):
    erh = await register(client, email="erh_pf@example.com", username="erh_pf")
    alex = await register(client, email="alex_pf@example.com", username="alex_pf")
    alex_id = await _user_id(client, alex)

    req = await client.post("/friends/request", json={"addressee_id": alex_id}, headers=auth_headers(erh))
    friend_id = req.json()["id"]

    pending = (await client.get(f"/users/{alex_id}", headers=auth_headers(erh))).json()
    assert pending["friend_request_pending"] is True
    assert pending["is_friend"] is False

    await client.post(f"/friends/{friend_id}/accept", headers=auth_headers(alex))
    accepted = (await client.get(f"/users/{alex_id}", headers=auth_headers(erh))).json()
    assert accepted["is_friend"] is True
    assert accepted["friend_request_pending"] is False


async def test_block_hides_profile_in_both_directions(client):
    erh = await register(client, email="erh_pb@example.com", username="erh_pb")
    alex = await register(client, email="alex_pb@example.com", username="alex_pb")
    erh_id = await _user_id(client, erh)
    alex_id = await _user_id(client, alex)

    await client.post("/blocks", json={"blocked_id": alex_id}, headers=auth_headers(erh))

    # the blocker cannot see the blocked...
    assert (await client.get(f"/users/{alex_id}", headers=auth_headers(erh))).status_code == 404
    # ...and, critically, the blocked cannot see the blocker either, or a
    # block would tell the blocked party they'd been blocked.
    assert (await client.get(f"/users/{erh_id}", headers=auth_headers(alex))).status_code == 404


async def test_friends_only_profile_restricts_non_friends(client):
    erh = await register(client, email="erh_pv@example.com", username="erh_pv")
    alex = await register(client, email="alex_pv@example.com", username="alex_pv")
    alex_id = await _user_id(client, alex)

    await client.patch(
        "/users/me",
        json={"bio": "secret bio", "visibility_settings": {"profile": "friends"}},
        headers=auth_headers(alex),
    )

    restricted = (await client.get(f"/users/{alex_id}", headers=auth_headers(erh))).json()
    assert restricted["restricted"] is True
    assert restricted["bio"] is None
    assert restricted["interests"] == []
    assert restricted["completed_quests"] == 0
    # Identity still resolves, so a stranger can send a request.
    assert restricted["username"] == "alex_pv"

    # Owner still sees their own profile in full.
    own = (await client.get(f"/users/{alex_id}", headers=auth_headers(alex))).json()
    assert own["restricted"] is False
    assert own["bio"] == "secret bio"


async def test_friend_request_notification_carries_ids(client):
    """The payload must let the client act where the notification is read."""
    erh = await register(client, email="erh_pn@example.com", username="erh_pn")
    alex = await register(client, email="alex_pn@example.com", username="alex_pn")
    alex_id = await _user_id(client, alex)

    await client.post("/friends/request", json={"addressee_id": alex_id}, headers=auth_headers(erh))

    notes = (await client.get("/notifications", headers=auth_headers(alex))).json()
    received = next(n for n in notes if n["type"] == "friend_request_received")
    assert received["payload"]["requester_username"] == "erh_pn"

    # Asserting truthiness is not enough: friend.id is generated on insert,
    # so a missing flush yields the *string* "None", which is truthy and
    # sailed straight through an earlier version of this test while the
    # inline accept 422'd in the real app. Assert the id actually works.
    friend_id = received["payload"]["friend_id"]
    assert friend_id not in (None, "None", "")
    accept = await client.post(f"/friends/{friend_id}/accept", headers=auth_headers(alex))
    assert accept.status_code == 200
    assert accept.json()["status"] == "accepted"

    requester_id = received["payload"]["requester_id"]
    assert requester_id not in (None, "None", "")
    assert (await client.get(f"/users/{requester_id}", headers=auth_headers(alex))).status_code == 200
