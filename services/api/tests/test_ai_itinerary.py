"""AI itinerary planning (Phase 8) — uses a fake provider
(app.dependency_overrides), not a real Ollama/Anthropic call, same
convention as tests/test_ai.py. parse_itinerary_json's validation/
clamping (including dropping a hallucinated quest_id) is the part with
real logic, covered directly below.
"""

import pytest

from app.ai.base import (
    GeneratedQuest,
    ItineraryCandidateQuest,
    ItineraryPlan,
    ItineraryPlanningContext,
    PlanStep,
    QuestGenerationError,
)
from app.ai.itinerary_prompt import parse_itinerary_json
from app.ai.service import get_ai_provider
from app.main import app
from tests.conftest import auth_headers, register


class FakeItineraryProvider:
    name = "fake"

    def __init__(self, plan: ItineraryPlan | None = None, error: str | None = None):
        self._plan = plan
        self._error = error

    async def generate_quest(self, ctx) -> tuple[GeneratedQuest, int | None]:  # pragma: no cover — unused here
        raise NotImplementedError

    async def plan_itinerary(self, ctx: ItineraryPlanningContext) -> tuple[ItineraryPlan, int | None]:
        if self._error:
            raise QuestGenerationError(self._error)
        assert self._plan is not None
        return self._plan, 99


def _quest_payload(**overrides):
    payload = {
        "title": "Hongdae Bowling Meetup",
        "description": "Join us for bowling.",
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
async def test_plan_itinerary_returns_steps_and_logs_generation(client, seed_reference_data):
    user = await register(client, email="itin1@example.com", username="itin1")
    quest = (await client.post("/quests", json=_quest_payload(), headers=auth_headers(user))).json()

    plan = ItineraryPlan(
        steps=[
            PlanStep(type="join_quest", reason="Perfect fit", quest_id=quest["id"]),
            PlanStep(
                type="book_activity", reason="Food after", activity_key="restaurant_table", party_size=2
            ),
        ]
    )
    app.dependency_overrides[get_ai_provider] = lambda: FakeItineraryProvider(plan=plan)

    resp = await client.post(
        "/ai/plan-itinerary", json={"free_text": "plan my Saturday", "city": "Seoul"}, headers=auth_headers(user)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["generation_id"]
    assert len(body["steps"]) == 2
    assert body["steps"][0]["type"] == "join_quest"
    assert body["steps"][0]["quest_id"] == quest["id"]
    assert body["steps"][0]["quest_title"] == "Hongdae Bowling Meetup"  # resolved server-side
    assert body["steps"][1]["activity_key"] == "restaurant_table"


@pytest.mark.asyncio
async def test_plan_itinerary_resolves_suggested_start_time_for_create_quest_steps(client, seed_reference_data):
    user = await register(client, email="itin2@example.com", username="itin2")

    plan = ItineraryPlan(
        steps=[
            PlanStep(
                type="create_quest",
                reason="Nothing else fits",
                title="Café Hop",
                description="Try 3 cafes.",
                category_key="category.photography",
                difficulty="easy",
                duration_minutes=90,
                budget_amount=10000,
                objectives=["Visit a cafe"],
                xp_reward=150,
                start_offset_minutes=120,
            )
        ]
    )
    app.dependency_overrides[get_ai_provider] = lambda: FakeItineraryProvider(plan=plan)

    resp = await client.post(
        "/ai/plan-itinerary", json={"free_text": "coffee afternoon", "city": "Seoul"}, headers=auth_headers(user)
    )
    assert resp.status_code == 200, resp.text
    step = resp.json()["steps"][0]
    assert step["type"] == "create_quest"
    assert step["title"] == "Café Hop"
    assert step["suggested_start_time"] is not None


@pytest.mark.asyncio
async def test_plan_itinerary_requires_auth(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeItineraryProvider(plan=ItineraryPlan(steps=[]))
    resp = await client.post("/ai/plan-itinerary", json={"free_text": "x", "city": "Seoul"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_plan_itinerary_provider_failure_is_502(client, seed_reference_data):
    app.dependency_overrides[get_ai_provider] = lambda: FakeItineraryProvider(error="model unreachable")
    user = await register(client, email="itin3@example.com", username="itin3")
    resp = await client.post(
        "/ai/plan-itinerary", json={"free_text": "x", "city": "Seoul"}, headers=auth_headers(user)
    )
    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_plan_itinerary_shares_daily_quota_with_quest_generation(client, seed_reference_data):
    from app.services.ai_quota_service import FREE_DAILY_LIMIT

    plan = ItineraryPlan(steps=[PlanStep(type="book_activity", reason="x", activity_key="bowling", party_size=2)])
    app.dependency_overrides[get_ai_provider] = lambda: FakeItineraryProvider(plan=plan)
    user = await register(client, email="itin4@example.com", username="itin4")

    for _ in range(FREE_DAILY_LIMIT):
        resp = await client.post(
            "/ai/plan-itinerary", json={"free_text": "x", "city": "Seoul"}, headers=auth_headers(user)
        )
        assert resp.status_code == 200, resp.text

    blocked = await client.post(
        "/ai/plan-itinerary", json={"free_text": "x", "city": "Seoul"}, headers=auth_headers(user)
    )
    assert blocked.status_code == 402


def _plan_ctx(**overrides):
    defaults = {
        "free_text": "x",
        "city": "Seoul",
        "valid_category_keys": ("category.food", "category.random"),
        "valid_activity_keys": ("bowling", "karaoke"),
        "candidate_quests": (
            ItineraryCandidateQuest(
                id="real-quest-id", title="Real Quest", category_key="category.food", start_time="2026-09-01T12:00:00+00:00", xp_reward=100
            ),
        ),
    }
    return ItineraryPlanningContext(**{**defaults, **overrides})


def test_parse_itinerary_json_happy_path():
    raw = '{"steps": [{"type": "join_quest", "quest_id": "real-quest-id", "reason": "fits"}]}'
    plan = parse_itinerary_json(raw, _plan_ctx())
    assert len(plan.steps) == 1
    assert plan.steps[0].quest_id == "real-quest-id"


def test_parse_itinerary_json_drops_hallucinated_quest_id():
    raw = (
        '{"steps": ['
        '{"type": "join_quest", "quest_id": "made-up-id-not-in-candidates", "reason": "fits"}, '
        '{"type": "book_activity", "activity_key": "bowling", "party_size": 2, "reason": "fun"}'
        "]}"
    )
    plan = parse_itinerary_json(raw, _plan_ctx())
    assert len(plan.steps) == 1  # the hallucinated join_quest step was dropped
    assert plan.steps[0].type == "book_activity"


def test_parse_itinerary_json_drops_unknown_activity_key():
    raw = '{"steps": [{"type": "book_activity", "activity_key": "skydiving", "party_size": 2, "reason": "fun"}]}'
    with pytest.raises(QuestGenerationError):
        parse_itinerary_json(raw, _plan_ctx())  # no valid steps survive


def test_parse_itinerary_json_clamps_create_quest_step():
    raw = (
        '{"steps": [{"type": "create_quest", "title": "T", "description": "D", '
        '"category_key": "category.nonsense", "difficulty": "impossible", '
        '"duration_minutes": 99999, "objectives": [], "start_offset_minutes": -50, "reason": "x"}]}'
    )
    plan = parse_itinerary_json(raw, _plan_ctx())
    step = plan.steps[0]
    assert step.category_key in ("category.food", "category.random")
    assert step.difficulty == "medium"
    assert step.duration_minutes == 360
    assert step.start_offset_minutes == 0


def test_parse_itinerary_json_rejects_non_json():
    with pytest.raises(QuestGenerationError):
        parse_itinerary_json("Sorry, I can't help with that.", _plan_ctx())


def test_parse_itinerary_json_caps_step_count():
    steps = ",".join(
        f'{{"type": "book_activity", "activity_key": "bowling", "party_size": 2, "reason": "{i}"}}' for i in range(10)
    )
    plan = parse_itinerary_json(f'{{"steps": [{steps}]}}', _plan_ctx())
    assert len(plan.steps) == 4  # capped at _MAX_STEPS
