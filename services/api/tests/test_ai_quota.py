"""Free/Pro AI generation quota + credit packs (Phase 6). Uses the same
fake AI provider override as tests/test_ai.py (no real Ollama/Anthropic
call) plus the real FakeProvider payment default (no real charge)."""

import pytest

from app.ai.base import GeneratedQuest, QuestGenerationContext
from app.ai.service import get_ai_provider
from app.main import app
from app.services.ai_quota_service import FREE_DAILY_LIMIT
from tests.conftest import auth_headers, register

pytestmark = pytest.mark.asyncio


class _FakeAIProvider:
    name = "fake"

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        return (
            GeneratedQuest(
                title="Quota Test Quest",
                description="Generated for a quota test.",
                category_key="category.photography",
                difficulty="medium",
                duration_minutes=90,
                budget_amount=None,
                xp_reward=200,
                objectives=["Do the thing"],
            ),
            10,
        )


@pytest.fixture(autouse=True)
def _fake_ai_provider():
    app.dependency_overrides[get_ai_provider] = lambda: _FakeAIProvider()
    yield
    app.dependency_overrides.pop(get_ai_provider, None)


def _generate(client, tokens):
    return client.post(
        "/ai/generate-quest", json={"free_text": "something fun", "city": "Seoul"}, headers=auth_headers(tokens)
    )


async def test_quota_defaults_to_free_with_zero_used(client, seed_reference_data):
    user = await register(client, email="quota1@example.com", username="quota1")
    resp = await client.get("/ai/quota", headers=auth_headers(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"is_pro": False, "daily_limit": FREE_DAILY_LIMIT, "used_today": 0, "credits_remaining": 0}


async def test_free_user_hits_daily_limit_then_gets_402(client, seed_reference_data):
    user = await register(client, email="quota2@example.com", username="quota2")
    for _ in range(FREE_DAILY_LIMIT):
        resp = await _generate(client, user)
        assert resp.status_code == 200, resp.text

    blocked = await _generate(client, user)
    assert blocked.status_code == 402
    assert "daily limit" in blocked.json()["detail"].lower()

    quota = (await client.get("/ai/quota", headers=auth_headers(user))).json()
    assert quota["used_today"] == FREE_DAILY_LIMIT


async def test_purchasing_credits_lets_a_free_user_generate_past_the_limit(client, seed_reference_data):
    user = await register(client, email="quota3@example.com", username="quota3")
    for _ in range(FREE_DAILY_LIMIT):
        await _generate(client, user)

    purchase = await client.post("/ai/credits/purchase", headers=auth_headers(user))
    assert purchase.status_code == 200, purchase.text
    assert purchase.json()["credits_remaining"] == 10

    after_credits = await _generate(client, user)
    assert after_credits.status_code == 200, after_credits.text

    quota = (await client.get("/ai/quota", headers=auth_headers(user))).json()
    assert quota["credits_remaining"] == 9  # one spent


async def test_pro_user_has_unlimited_generations(client, seed_reference_data):
    user = await register(client, email="quota4@example.com", username="quota4")
    await client.post("/subscriptions/subscribe", headers=auth_headers(user))

    for _ in range(FREE_DAILY_LIMIT + 2):
        resp = await _generate(client, user)
        assert resp.status_code == 200, resp.text

    quota = (await client.get("/ai/quota", headers=auth_headers(user))).json()
    assert quota["is_pro"] is True
    assert quota["credits_remaining"] == 0  # never had to spend any
