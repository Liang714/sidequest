import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


async def test_register_then_me(client):
    tokens = await register(client, email="erh@example.com", username="erh")
    resp = await client.get("/auth/me", headers=auth_headers(tokens))
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "erh"
    assert body["email"] == "erh@example.com"
    assert body["xp"] == 0
    assert body["level"] == 1


async def test_duplicate_email_rejected(client):
    await register(client, email="dup@example.com", username="dupuser1")
    resp = await client.post(
        "/auth/register",
        json={
            "email": "dup@example.com",
            "username": "dupuser2",
            "password": "correcthorsebattery",
            "display_name": "Dup",
        },
    )
    assert resp.status_code == 409


async def test_login_with_wrong_password_rejected(client):
    await register(client, email="wrongpw@example.com", username="wrongpw")
    resp = await client.post(
        "/auth/login", json={"email": "wrongpw@example.com", "password": "not-the-password"}
    )
    assert resp.status_code == 401


async def test_login_success_issues_new_tokens(client):
    await register(client, email="login@example.com", username="loginuser")
    resp = await client.post(
        "/auth/login", json={"email": "login@example.com", "password": "correcthorsebattery"}
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_me_requires_auth(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401


async def test_refresh_token_cannot_be_used_as_access_token(client):
    tokens = await register(client, email="refresh@example.com", username="refreshuser")
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert resp.status_code == 401
