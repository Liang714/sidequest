"""Photo-objective vision verification (Phase 8) — uses a fake verifier
(app.dependency_overrides), not a real Ollama vision call, same convention
as tests/test_ai.py. See scripts/measure_vision_accuracy.py for the real
accuracy measurement (58% correct / 17% false-positive / 25% false-negative
on a labeled synthetic set) that's why this stays advisory-only: these
tests exist to prove the advisory behavior, not to validate model accuracy.
"""

import base64

import pytest

from app.main import app
from app.vision.base import VisionVerificationError, VisionVerificationResult
from app.vision.service import get_vision_verifier
from tests.conftest import auth_headers, register

# A real 1x1 PNG — content doesn't matter, the verifier is faked.
_TINY_PNG_B64 = base64.b64encode(
    bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
        "53de0000000c4944415478da6360606060000000050001a5f645400000000049454e44ae426082"
    )
).decode()


class FakeVisionVerifier:
    name = "fake-vision"

    def __init__(self, result: VisionVerificationResult | None = None, error: str | None = None):
        self._result = result
        self._error = error

    async def verify(self, *, image_bytes: bytes, objective_description: str) -> VisionVerificationResult:
        if self._error:
            raise VisionVerificationError(self._error)
        assert self._result is not None
        return self._result


def _quest_payload(**overrides):
    payload = {
        "title": "Photo Hunt",
        "description": "Find things and photograph them.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-09-25T19:00:00+00:00",
        "duration_minutes": 90,
        "max_participants": 4,
        "difficulty": "easy",
        "xp_reward": 150,
        "objectives": [{"description": "Find a red circle", "verification_type": "photo"}],
    }
    payload.update(overrides)
    return payload


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.pop(get_vision_verifier, None)


async def _create_and_join(client, tokens):
    create = await client.post("/quests", json=_quest_payload(), headers=auth_headers(tokens))
    assert create.status_code == 201, create.text
    quest = create.json()
    await client.post(f"/quests/{quest['id']}/join", headers=auth_headers(tokens))
    return quest["id"], quest["objectives"][0]["id"]


@pytest.mark.asyncio
async def test_verify_photo_completes_objective_even_when_ai_says_no_match(client, seed_reference_data):
    """The core advisory-only guarantee: a confidently-wrong AI verdict
    never blocks completion — see docs/AI.md §VisionVerifier."""
    app.dependency_overrides[get_vision_verifier] = lambda: FakeVisionVerifier(
        result=VisionVerificationResult(matches=False, confidence=0.95, explanation="Definitely not a red circle.")
    )
    user = await register(client, email="vision1@example.com", username="vision1")
    quest_id, obj_id = await _create_and_join(client, user)

    resp = await client.post(
        f"/quests/{quest_id}/objectives/{obj_id}/verify-photo",
        json={"image_base64": _TINY_PNG_B64, "content_type": "image/png"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["objective"]["completed_by_me"] is True  # completed regardless
    assert body["ai_verification"]["matches"] is False
    assert body["ai_verification"]["confidence"] == 0.95


@pytest.mark.asyncio
async def test_verify_photo_still_completes_when_provider_errors(client, seed_reference_data):
    app.dependency_overrides[get_vision_verifier] = lambda: FakeVisionVerifier(error="model unreachable")
    user = await register(client, email="vision2@example.com", username="vision2")
    quest_id, obj_id = await _create_and_join(client, user)

    resp = await client.post(
        f"/quests/{quest_id}/objectives/{obj_id}/verify-photo",
        json={"image_base64": _TINY_PNG_B64, "content_type": "image/png"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["objective"]["completed_by_me"] is True
    assert body["ai_verification"] is None


@pytest.mark.asyncio
async def test_verify_photo_rejects_invalid_base64(client, seed_reference_data):
    app.dependency_overrides[get_vision_verifier] = lambda: FakeVisionVerifier(
        result=VisionVerificationResult(matches=True, confidence=1.0, explanation="x")
    )
    user = await register(client, email="vision3@example.com", username="vision3")
    quest_id, obj_id = await _create_and_join(client, user)

    resp = await client.post(
        f"/quests/{quest_id}/objectives/{obj_id}/verify-photo",
        json={"image_base64": "not valid base64!!", "content_type": "image/png"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_verify_photo_requires_auth(client, seed_reference_data):
    app.dependency_overrides[get_vision_verifier] = lambda: FakeVisionVerifier(
        result=VisionVerificationResult(matches=True, confidence=1.0, explanation="x")
    )
    resp = await client.post(
        "/quests/00000000-0000-0000-0000-000000000000/objectives/00000000-0000-0000-0000-000000000000/verify-photo",
        json={"image_base64": _TINY_PNG_B64, "content_type": "image/png"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_verify_photo_unknown_objective_is_404(client, seed_reference_data):
    app.dependency_overrides[get_vision_verifier] = lambda: FakeVisionVerifier(
        result=VisionVerificationResult(matches=True, confidence=1.0, explanation="x")
    )
    user = await register(client, email="vision4@example.com", username="vision4")
    quest_id, _obj_id = await _create_and_join(client, user)

    resp = await client.post(
        f"/quests/{quest_id}/objectives/00000000-0000-0000-0000-000000000000/verify-photo",
        json={"image_base64": _TINY_PNG_B64, "content_type": "image/png"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 404
