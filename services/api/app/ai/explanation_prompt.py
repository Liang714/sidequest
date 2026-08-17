"""Recommendation-explanation prompt + response cleanup — the "predictive
recommendations" piece of Phase 8 (docs/AI.md's roadmap step 5:
"LLM-assisted reasoning... only for explaining *why* something was
recommended"). Deliberately not structured JSON output like
prompt.py/itinerary_prompt.py: a one-sentence explanation doesn't need a
schema, just length-capping and stripping any "thinking" preamble a model
like qwen3 can emit in plain-text mode (format=json suppresses that on
the other AI paths; this one can't use format=json since it's not JSON).

Grounded in the REAL compute_compatibility() breakdown — see
RecommendationExplanationContext — so the model explains actual computed
signals it's given, never a fabricated one.
"""

import re

from app.ai.base import RecommendationExplanationContext

EXPLANATION_SYSTEM_PROMPT = """You write ONE short, warm sentence (max 25 words) explaining \
why a SideQuest activity was recommended to someone, based ONLY on the real signals given to \
you below. Never invent a reason not backed by those signals. Reply with the sentence only — \
no preamble, no quotes, no explanation of your reasoning."""

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


def build_explanation_user_prompt(ctx: RecommendationExplanationContext) -> str:
    signals = ", ".join(ctx.breakdown_labels) or "general fit"
    return (
        f'Quest: "{ctx.quest_title}" (category: {ctx.quest_category_key})\n'
        f"Compatibility score: {ctx.compatibility_score}/100\n"
        f"Real matching signals: {signals}\n"
        f"Write the one-sentence explanation now."
    )


def clean_explanation(raw: str) -> str:
    text = _THINK_BLOCK.sub("", raw).strip()
    text = text.strip('"').strip()
    return text[:200] or "A good fit based on your interests and location."
