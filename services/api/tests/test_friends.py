import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


async def test_friend_request_accept_flow(client):
    erh = await register(client, email="erh_f@example.com", username="erh_f")
    alex = await register(client, email="alex_f@example.com", username="alex_f")
    alex_id = (await client.get("/auth/me", headers=auth_headers(alex))).json()["user_id"]

    resp = await client.post("/friends/request", json={"addressee_id": alex_id}, headers=auth_headers(erh))
    assert resp.status_code == 201
    friend_id = resp.json()["id"]
    assert resp.json()["status"] == "pending"

    # duplicate request while pending is rejected
    dup = await client.post("/friends/request", json={"addressee_id": alex_id}, headers=auth_headers(erh))
    assert dup.status_code == 409

    accept = await client.post(f"/friends/{friend_id}/accept", headers=auth_headers(alex))
    assert accept.status_code == 200
    assert accept.json()["status"] == "accepted"

    erh_friends = (await client.get("/friends", headers=auth_headers(erh))).json()
    assert any(f["username"] == "alex_f" for f in erh_friends)

    notifications = (await client.get("/notifications", headers=auth_headers(alex))).json()
    assert any(n["type"] == "friend_request_received" for n in notifications)


async def test_blocked_user_cannot_be_friend_requested(client):
    erh = await register(client, email="erh_b@example.com", username="erh_b")
    alex = await register(client, email="alex_b@example.com", username="alex_b")
    alex_id = (await client.get("/auth/me", headers=auth_headers(alex))).json()["user_id"]

    block = await client.post("/blocks", json={"blocked_id": alex_id}, headers=auth_headers(erh))
    assert block.status_code == 201

    resp = await client.post("/friends/request", json={"addressee_id": alex_id}, headers=auth_headers(erh))
    assert resp.status_code == 403


async def test_cannot_friend_yourself(client):
    erh = await register(client, email="erh_self@example.com", username="erh_self")
    erh_id = (await client.get("/auth/me", headers=auth_headers(erh))).json()["user_id"]
    resp = await client.post("/friends/request", json={"addressee_id": erh_id}, headers=auth_headers(erh))
    assert resp.status_code == 400
