"""Shared prompt construction + response parsing — both providers produce
the exact same JSON contract, so this logic isn't duplicated per-provider.
"""

import json
import re

from app.ai.base import GeneratedQuest, QuestGenerationContext, QuestGenerationError

_DIFFICULTIES = ("easy", "medium", "hard", "epic")
_XP_BY_DIFFICULTY = {"easy": 150, "medium": 250, "hard": 350, "epic": 500}

SYSTEM_PROMPT = """You design short, real-world social activities called "SideQuests" \
for a Seoul-first app. Given a person's free-text situation, invent ONE concrete, \
fun, safe activity they could do — ideally with other people — right now.

Reply with ONLY a single JSON object, no markdown fences, no commentary, matching \
exactly this shape:
{
  "title": "short punchy title, max 60 chars",
  "description": "1-2 sentences describing the activity",
  "category_key": "one of the allowed category keys, exactly as given",
  "difficulty": "easy | medium | hard | epic",
  "duration_minutes": integer, 30-360,
  "budget_amount": number in KRW or null if free,
  "objectives": ["2-4 short, concrete, checkable steps"]
}

Keep it grounded and specific to the location and budget given — no generic filler.
Never suggest anything illegal, unsafe, or that requires special equipment the \
person didn't mention having."""


def build_user_prompt(ctx: QuestGenerationContext) -> str:
    location = f"{ctx.city}" + (f" (near {ctx.lat:.4f},{ctx.lng:.4f})" if ctx.lat and ctx.lng else "")
    return (
        f"Situation: {ctx.free_text}\n"
        f"City: {location}\n"
        f"Allowed category_key values: {', '.join(ctx.valid_category_keys)}\n"
    )


def parse_quest_json(raw: str, ctx: QuestGenerationContext) -> GeneratedQuest:
    """Parses + validates/clamps a provider's raw text into a GeneratedQuest.
    Providers are asked for bare JSON but models sometimes wrap it in
    markdown fences or add stray text around it anyway — strip defensively
    before parsing rather than failing the whole generation over it.
    """
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise QuestGenerationError("Model response did not contain a JSON object")
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise QuestGenerationError(f"Model response was not valid JSON: {exc}") from exc

    title = str(data.get("title") or "").strip()[:120] or "Untitled Quest"
    description = str(data.get("description") or "").strip()[:2000] or title

    category_key = str(data.get("category_key") or "")
    if category_key not in ctx.valid_category_keys:
        category_key = "category.random" if "category.random" in ctx.valid_category_keys else ctx.valid_category_keys[0]

    difficulty = str(data.get("difficulty") or "medium").lower()
    if difficulty not in _DIFFICULTIES:
        difficulty = "medium"

    try:
        duration_minutes = int(data.get("duration_minutes") or 90)
    except (TypeError, ValueError):
        duration_minutes = 90
    duration_minutes = max(30, min(duration_minutes, 360))

    budget_raw = data.get("budget_amount")
    try:
        budget_amount = float(budget_raw) if budget_raw is not None else None
    except (TypeError, ValueError):
        budget_amount = None
    if budget_amount is not None:
        budget_amount = max(0.0, min(budget_amount, 500_000.0))

    objectives_raw = data.get("objectives")
    objectives = [str(o).strip()[:280] for o in objectives_raw if str(o).strip()] if isinstance(objectives_raw, list) else []
    if not objectives:
        objectives = ["Complete the activity together", "Check in when you arrive"]
    objectives = objectives[:6]

    return GeneratedQuest(
        title=title,
        description=description,
        category_key=category_key,
        difficulty=difficulty,
        duration_minutes=duration_minutes,
        budget_amount=budget_amount,
        xp_reward=_XP_BY_DIFFICULTY[difficulty],
        objectives=objectives,
    )
