"""AI-explained recommendations (Phase 8) — uses a fake provider
(app.dependency_overrides), not a real Ollama/Anthropic call, same
convention as tests/test_ai.py. See app/ai/explanation_prompt.py for why
this is grounded in the real compute_compatibility() breakdown rather
than letting the model invent a reason.
"""

import pytest

from app.ai.base import (
    GeneratedQuest,
    ItineraryPlan,
    QuestGenerationError,
    RecommendationExplanationContext,
)
from app.ai.service import get_ai_provider
from app.main import app
from tests.conftest import auth_headers, register


class FakeExplanationProvider:
    name = "fake"

    def __init__(self, explanation: str | None = None, error: str | None = None):
        self._explanation = explanation
        self._error = error

    async def generate_quest(self, ctx) -> tuple[GeneratedQuest, int | None]:  # pragma: no cover — unused here
        raise NotImplementedError

    async def plan_itinerary(self, ctx) -> tuple[ItineraryPlan, int | None]:  # pragma: no cover — unused here
        raise NotImplementedError

    async def explain_recommendation(self, ctx: RecommendationExplanationContext) -> tuple[str, int | None]:
        if self._error:
            raise QuestGenerationError(self._error)
        assert self._explanation is not None
        return self._explanation, 12


def _quest_payload(**overrides):
    payload = {
        "title": "Hongdae Photo Walk",
        "description": "A photography quest.",
        "category_key": "category.photography",
        "location": {"lat": 37.5563, "lng": 126.9236, "city": "Seoul", "country": "KR"},
        "start_time": "2026-09-25T19:00:00+00:00",
        "duration_minutes": 90,
        "max_participants": 4,
        "difficulty": "easy",
        "xp_reward": 150,
        "objectives": [],
    }
    payload.update(overrides)
    return payload


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_explain_recommendation_returns_explanation_and_score(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeExplanationProvider(
        explanation="A great fit — it's close by and matches your interests."
    )
    user = await register(client, email="explain1@example.com", username="explain1")
    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))).json()

    resp = await client.post(
        "/ai/explain-recommendation",
        json={"quest_id": quest["id"], "lat": 37.5563, "lng": 126.9236},
        headers=auth_headers(user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["explanation"] == "A great fit — it's close by and matches your interests."
    assert 0 <= body["score"] <= 100
    assert body["provider"] == "fake"


@pytest.mark.asyncio
async def test_explain_recommendation_requires_auth(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeExplanationProvider(explanation="x")
    resp = await client.post(
        "/ai/explain-recommendation", json={"quest_id": "00000000-0000-0000-0000-000000000000"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_explain_recommendation_unknown_quest_is_404(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeExplanationProvider(explanation="x")
    user = await register(client, email="explain2@example.com", username="explain2")
    resp = await client.post(
        "/ai/explain-recommendation",
        json={"quest_id": "00000000-0000-0000-0000-000000000000"},
        headers=auth_headers(user),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_explain_recommendation_provider_failure_is_502(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeExplanationProvider(error="model unreachable")
    user = await register(client, email="explain3@example.com", username="explain3")
    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))).json()

    resp = await client.post(
        "/ai/explain-recommendation", json={"quest_id": quest["id"]}, headers=auth_headers(user)
    )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_explain_recommendation_shares_daily_quota(client, seed_reference_data):
    from app.services.ai_quota_service import FREE_DAILY_LIMIT

    app.dependency_overrides[get_ai_provider] = lambda: FakeExplanationProvider(explanation="x")
    user = await register(client, email="explain4@example.com", username="explain4")
    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))).json()

    for _ in range(FREE_DAILY_LIMIT):
        resp = await client.post(
            "/ai/explain-recommendation", json={"quest_id": quest["id"]}, headers=auth_headers(user)
        )
        assert resp.status_code == 200, resp.text

    blocked = await client.post(
        "/ai/explain-recommendation", json={"quest_id": quest["id"]}, headers=auth_headers(user)
    )
    assert blocked.status_code == 402
