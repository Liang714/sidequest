"""Itinerary-planning prompt construction + response parsing — mirrors
app/ai/prompt.py's split (shared contract, provider-agnostic parsing) for
the same reason: both providers produce the exact same JSON shape.

The model never executes anything — it only proposes a plan. Every step
gets validated/clamped here exactly like a single quest draft does in
parse_quest_json, plus one extra rule specific to plans: a "join_quest"
step's quest_id must be one of the real candidate quests it was given —
any id it invents is silently dropped, never passed through.
"""

import json
import re
from typing import Any

from app.ai.base import ItineraryCandidateQuest, ItineraryPlan, ItineraryPlanningContext, PlanStep
from app.ai.base import (
    QuestGenerationError as ItineraryPlanningError,  # same failure shape, see routers/ai.py
)

_DIFFICULTIES = ("easy", "medium", "hard", "epic")
_XP_BY_DIFFICULTY = {"easy": 150, "medium": 250, "hard": 350, "epic": 500}
_STEP_TYPES = ("join_quest", "create_quest", "book_activity")
_MAX_STEPS = 4

ITINERARY_SYSTEM_PROMPT = """You plan short multi-step real-world itineraries called \
"SideQuest plans" for a Seoul-first social app. Given a person's free-text goal, a list \
of REAL currently-open quests they could join, and a list of bookable activity types, \
propose 2-4 ordered steps that add up to a fun plan.

Each step must be exactly one of:
  - {"type": "join_quest", "quest_id": "<id from the given candidate list ONLY>", "reason": "..."}
  - {"type": "create_quest", "title": "...", "description": "...", "category_key": "<allowed key>", \
"difficulty": "easy|medium|hard|epic", "duration_minutes": 30-360, "budget_amount": number or null, \
"objectives": ["2-4 short steps"], "start_offset_minutes": integer minutes from now, "reason": "..."}
  - {"type": "book_activity", "activity_key": "<allowed key>", "party_size": 1-10, "reason": "..."}

Reply with ONLY a single JSON object, no markdown fences, no commentary:
{"steps": [ ...2 to 4 step objects... ]}

NEVER invent a quest_id that isn't in the candidate list given to you — if none of the \
candidates fit, use create_quest or book_activity steps instead. Keep the plan grounded, \
safe, and specific to the budget/time implied by the free text."""


def build_itinerary_user_prompt(ctx: ItineraryPlanningContext) -> str:
    location = f"{ctx.city}" + (f" (near {ctx.lat:.4f},{ctx.lng:.4f})" if ctx.lat and ctx.lng else "")
    candidates = "\n".join(
        f"  - id={q.id} | {q.title} | {q.category_key} | starts {q.start_time} | +{q.xp_reward} XP"
        for q in ctx.candidate_quests
    ) or "  (none open right now — use create_quest/book_activity instead)"
    return (
        f"Goal: {ctx.free_text}\n"
        f"City: {location}\n"
        f"Allowed category_key values: {', '.join(ctx.valid_category_keys)}\n"
        f"Allowed activity_key values: {', '.join(ctx.valid_activity_keys)}\n"
        f"Real open quests available to join:\n{candidates}\n"
    )


def _clamp_create_quest_step(data: dict[str, Any], reason: str, ctx: ItineraryPlanningContext) -> PlanStep:
    title = str(data.get("title") or "").strip()[:120] or "Untitled Quest"
    description = str(data.get("description") or "").strip()[:2000] or title

    category_key = str(data.get("category_key") or "")
    if category_key not in ctx.valid_category_keys:
        category_key = "category.random" if "category.random" in ctx.valid_category_keys else ctx.valid_category_keys[0]

    difficulty = str(data.get("difficulty") or "medium").lower()
    if difficulty not in _DIFFICULTIES:
        difficulty = "medium"

    try:
        duration_minutes = max(30, min(int(data.get("duration_minutes") or 90), 360))
    except (TypeError, ValueError):
        duration_minutes = 90

    budget_raw = data.get("budget_amount")
    try:
        budget_amount = float(budget_raw) if budget_raw is not None else None
    except (TypeError, ValueError):
        budget_amount = None
    if budget_amount is not None:
        budget_amount = max(0.0, min(budget_amount, 500_000.0))

    objectives_raw = data.get("objectives")
    objectives = (
        [str(o).strip()[:280] for o in objectives_raw if str(o).strip()] if isinstance(objectives_raw, list) else []
    ) or ["Complete the activity together"]
    objectives = objectives[:6]

    try:
        start_offset_minutes = max(0, min(int(data.get("start_offset_minutes") or 60), 10080))  # cap at a week out
    except (TypeError, ValueError):
        start_offset_minutes = 60

    return PlanStep(
        type="create_quest",
        reason=reason,
        title=title,
        description=description,
        category_key=category_key,
        difficulty=difficulty,
        duration_minutes=duration_minutes,
        budget_amount=budget_amount,
        objectives=objectives,
        xp_reward=_XP_BY_DIFFICULTY[difficulty],
        start_offset_minutes=start_offset_minutes,
    )


def parse_itinerary_json(raw: str, ctx: ItineraryPlanningContext) -> ItineraryPlan:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ItineraryPlanningError("Model response did not contain a JSON object")
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise ItineraryPlanningError(f"Model response was not valid JSON: {exc}") from exc

    raw_steps = data.get("steps")
    if not isinstance(raw_steps, list):
        raise ItineraryPlanningError("Model response had no 'steps' array")

    candidate_ids = {q.id for q in ctx.candidate_quests}
    valid_activity_keys = set(ctx.valid_activity_keys)

    steps: list[PlanStep] = []
    for raw_step in raw_steps[:_MAX_STEPS]:
        if not isinstance(raw_step, dict):
            continue
        step_type = raw_step.get("type")
        reason = str(raw_step.get("reason") or "").strip()[:280]

        if step_type == "join_quest":
            quest_id = str(raw_step.get("quest_id") or "")
            if quest_id not in candidate_ids:
                continue  # hallucinated id — drop the step rather than trust it
            steps.append(PlanStep(type="join_quest", reason=reason, quest_id=quest_id))

        elif step_type == "create_quest":
            steps.append(_clamp_create_quest_step(raw_step, reason, ctx))

        elif step_type == "book_activity":
            activity_key = str(raw_step.get("activity_key") or "")
            if activity_key not in valid_activity_keys:
                continue
            try:
                party_size = max(1, min(int(raw_step.get("party_size") or 2), 10))
            except (TypeError, ValueError):
                party_size = 2
            steps.append(PlanStep(type="book_activity", reason=reason, activity_key=activity_key, party_size=party_size))

    if not steps:
        raise ItineraryPlanningError("No valid plan steps survived validation")

    return ItineraryPlan(steps=steps)


__all__ = [
    "ITINERARY_SYSTEM_PROMPT",
    "ItineraryCandidateQuest",
    "build_itinerary_user_prompt",
    "parse_itinerary_json",
]
