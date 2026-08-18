"""Regression tests for the 2026-08-18 security review — see
docs/SECURITY.md §Security review for the full writeup of what each of
these was and how it was found (several were confirmed exploitable live
against the real deployment before being fixed here).
"""

import pytest

from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


def _quest_payload(**overrides):
    payload = {
        "title": "Security Test Quest",
        "description": "Exists to test objective-completion authorization.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-08-20T20:00:00+09:00",
        "duration_minutes": 60,
        "max_participants": 4,
        "difficulty": "easy",
        "xp_reward": 150,
        "objectives": [{"description": "Do the thing", "is_required": True}],
    }
    payload.update(overrides)
    return payload


# ---- IDOR: objective completion without ever joining -----------------


async def test_cannot_complete_objective_without_joining(client, seed_reference_data):
    creator = await register(client, email="idor-creator@example.com", username="idorcreator")
    attacker = await register(client, email="idor-attacker@example.com", username="idorattacker")

    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(creator))
    quest = create.json()
    quest_id, obj_id = quest["id"], quest["objectives"][0]["id"]

    # Never joined — this used to succeed and silently write a completion
    # row that /complete's required-objectives check would later trust.
    resp = await client.post(
        f"/quests/{quest_id}/objectives/{obj_id}/complete", headers=auth_headers(attacker)
    )
    assert resp.status_code == 403

    # Confirm the exploit chain is actually closed, not just this one
    # call: join *after* the (failed) pre-stage attempt, then try to
    # complete the quest outright.
    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(attacker))
    complete = await client.post(f"/quests/{quest_id}/complete", headers=auth_headers(attacker))
    assert complete.status_code == 409  # required objective genuinely still not done


async def test_verify_photo_also_requires_joining(client, seed_reference_data):
    creator = await register(client, email="idor-creator2@example.com", username="idorcreator2")
    attacker = await register(client, email="idor-attacker2@example.com", username="idorattacker2")

    create = await client.post(
        "/quests",
        json=_quest_payload(objectives=[{"description": "Photo it", "verification_type": "photo"}]),
        headers=auth_headers(creator),
    )
    quest = create.json()
    quest_id, obj_id = quest["id"], quest["objectives"][0]["id"]

    resp = await client.post(
        f"/quests/{quest_id}/objectives/{obj_id}/verify-photo",
        json={"image_base64": "AAAA", "content_type": "image/png"},
        headers=auth_headers(attacker),
    )
    assert resp.status_code == 403


async def test_participant_can_still_complete_objectives_normally(client, seed_reference_data):
    """The fix is a real authorization check, not an accidental block on
    everyone — a real participant still completes objectives fine."""
    user = await register(client, email="realparticipant@example.com", username="realparticipant")
    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))
    quest = create.json()
    quest_id, obj_id = quest["id"], quest["objectives"][0]["id"]

    await client.post(f"/quests/{quest_id}/join", headers=auth_headers(user))
    resp = await client.post(f"/quests/{quest_id}/objectives/{obj_id}/complete", headers=auth_headers(user))
    assert resp.status_code == 200
    assert resp.json()["objectives"][0]["completed_by_me"] is True


# ---- Login timing / enumeration ----------------------------------------


async def test_login_nonexistent_email_returns_clean_401(client):
    """Must behave identically (status-wise) to a wrong password for a
    real email — see _DUMMY_PASSWORD_HASH in app/routers/auth.py. This
    doesn't (can't, reliably, in a fast unit test) assert the timing
    equalization itself, just that the dummy-hash path doesn't crash or
    behave differently."""
    resp = await client.post(
        "/auth/login", json={"email": "definitely-not-registered@example.com", "password": "whatever123"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"


# ---- Rate limiting -------------------------------------------------------


async def test_login_rate_limited_after_repeated_attempts(client):
    """app/deps.py::rate_limit — 10/min on /auth/login. All these share
    one Valkey bucket (see _clean_rate_limits' docstring: the test client
    always presents the same fake IP), so the 11th attempt within the
    same run must 429 regardless of the (wrong) password each one uses.
    """
    for _ in range(10):
        resp = await client.post(
            "/auth/login", json={"email": "ratelimit-probe@example.com", "password": "wrong"}
        )
        assert resp.status_code == 401

    resp = await client.post(
        "/auth/login", json={"email": "ratelimit-probe@example.com", "password": "wrong"}
    )
    assert resp.status_code == 429


async def test_quest_creation_rate_limited(client, seed_reference_data):
    """10/min on POST /quests — a real participant, not an anonymous
    caller, so this exercises the per-user bucket (request.state.user_id)
    rather than the per-IP one the login test above exercises."""
    user = await register(client, email="quotaspam@example.com", username="quotaspam")
    for _ in range(10):
        resp = await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))
        assert resp.status_code == 201, resp.text

    resp = await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))
    assert resp.status_code == 429


async def test_rate_limit_buckets_are_independent_per_user(client, seed_reference_data):
    """A second user's quota is untouched by the first user's — proves
    the per-user keying actually works, not just a global limit."""
    spammer = await register(client, email="spammer@example.com", username="spammeruser")
    bystander = await register(client, email="bystander@example.com", username="bystanderuser")

    for _ in range(10):
        resp = await client.post("/quests", json=_quest_payload(), headers=auth_headers(spammer))
        assert resp.status_code == 201
    assert (await client.post("/quests", json=_quest_payload(), headers=auth_headers(spammer))).status_code == 429

    # bystander's own bucket is fresh
    resp = await client.post("/quests", json=_quest_payload(), headers=auth_headers(bystander))
    assert resp.status_code == 201


# ---- Security headers ----------------------------------------------------


async def test_security_headers_present(client):
    resp = await client.get("/health")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert resp.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "max-age=" in resp.headers.get("strict-transport-security", "")
