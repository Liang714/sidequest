"""AI quest generation — uses a fake provider (app.dependency_overrides),
not the real Ollama/Anthropic call. Provider selection itself is a
one-line factory (app/ai/service.py) not worth integration-testing against
a live model in the suite; parse_quest_json's clamping/validation is the
part with real logic, covered directly below.
"""

import pytest

from app.ai.base import GeneratedQuest, QuestGenerationContext, QuestGenerationError
from app.ai.prompt import parse_quest_json
from app.ai.service import get_ai_provider
from app.main import app
from tests.conftest import auth_headers, register


class FakeProvider:
    name = "fake"

    def __init__(self, quest: GeneratedQuest | None = None, error: str | None = None):
        self._quest = quest
        self._error = error

    async def generate_quest(self, ctx: QuestGenerationContext) -> tuple[GeneratedQuest, int | None]:
        if self._error:
            raise QuestGenerationError(self._error)
        assert self._quest is not None
        return self._quest, 42


_SAMPLE = GeneratedQuest(
    title="Hongdae Photo Hunt",
    description="Chase neon signs across Hongdae.",
    category_key="category.photography",
    difficulty="medium",
    duration_minutes=120,
    budget_amount=15000,
    xp_reward=250,
    objectives=["Find a neon sign", "Take a group photo"],
)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_generate_quest_returns_draft_and_logs_generation(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeProvider(quest=_SAMPLE)
    erh = await register(client, email="ai1@example.com", username="ai1")

    resp = await client.post(
        "/ai/generate-quest",
        json={"free_text": "bored near Hongdae, 3 hours, 20000 won, like dancing and photography"},
        headers=auth_headers(erh),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["title"] == "Hongdae Photo Hunt"
    assert body["provider"] == "fake"
    assert len(body["objectives"]) == 2
    assert body["generation_id"]


@pytest.mark.asyncio
async def test_generate_quest_requires_auth(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeProvider(quest=_SAMPLE)
    resp = await client.post("/ai/generate-quest", json={"free_text": "anything"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_generate_quest_provider_failure_is_502(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeProvider(error="model unreachable")
    erh = await register(client, email="ai2@example.com", username="ai2")

    resp = await client.post(
        "/ai/generate-quest", json={"free_text": "anything"}, headers=auth_headers(erh)
    )
    assert resp.status_code == 502


def _ctx(**overrides):
    defaults = {
        "free_text": "x", "city": "Seoul", "valid_category_keys": ("category.food", "category.random")
    }
    return QuestGenerationContext(**{**defaults, **overrides})


def test_parse_quest_json_happy_path():
    raw = (
        '{"title": "Snack Crawl", "description": "Eat things.", '
        '"category_key": "category.food", "difficulty": "hard", '
        '"duration_minutes": 90, "budget_amount": 12000, '
        '"objectives": ["Try 3 stalls", "Vote on the best"]}'
    )
    quest = parse_quest_json(raw, _ctx())
    assert quest.title == "Snack Crawl"
    assert quest.category_key == "category.food"
    assert quest.difficulty == "hard"
    assert quest.xp_reward == 350
    assert quest.objectives == ["Try 3 stalls", "Vote on the best"]


def test_parse_quest_json_strips_markdown_fences():
    raw = '```json\n{"title": "T", "description": "D", "category_key": "category.food", ' \
        '"difficulty": "easy", "duration_minutes": 60, "objectives": ["a", "b"]}\n```'
    quest = parse_quest_json(raw, _ctx())
    assert quest.title == "T"


def test_parse_quest_json_clamps_invalid_category_and_difficulty():
    raw = '{"title": "T", "description": "D", "category_key": "category.nonsense", ' \
        '"difficulty": "impossible", "duration_minutes": 99999, "objectives": []}'
    quest = parse_quest_json(raw, _ctx())
    assert quest.category_key in ("category.food", "category.random")
    assert quest.difficulty == "medium"
    assert quest.duration_minutes == 360  # clamped to the max
    assert len(quest.objectives) >= 1  # falls back to a default checklist


def test_parse_quest_json_rejects_non_json():
    with pytest.raises(QuestGenerationError):
        parse_quest_json("Sorry, I can't help with that.", _ctx())
