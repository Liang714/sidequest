"""Compatibility scoring — deliberately NOT an LLM call (see docs/AI.md:
"use conventional algorithms where they're cheaper and more reliable" and
docs/ARCHITECTURE.md §Matching). A weighted sum over signals we actually
store today.

This is a trimmed version of the product spec's full formula
(interest + location + time + budget + group-size + language overlap):
group-size/vibe preferences and a language field were never persisted (see
docs/DATABASE.md — onboarding's group-size/vibe steps are UI-only in
Phase 2), so this uses the three signals that really exist —
`user_interests`, real lat/lng (when the caller has one), and the quest's
current fill ratio as a social-proof proxy. Extending the formula is a
matter of adding a term once those preferences are stored, not a rewrite.
"""

from dataclasses import dataclass

from app.services.quest_service import haversine_km

INTEREST_WEIGHT = 50
PROXIMITY_WEIGHT = 30
FILL_WEIGHT = 20
PROXIMITY_FULL_CREDIT_KM = 2.0
PROXIMITY_ZERO_CREDIT_KM = 20.0


@dataclass(frozen=True)
class ScoreBreakdown:
    label_key: str
    points: int


@dataclass(frozen=True)
class CompatibilityScore:
    score: int
    breakdown: list[ScoreBreakdown]


def compute_compatibility(
    *,
    user_interest_category_keys: set[str],
    quest_category_key: str,
    user_lat: float | None,
    user_lng: float | None,
    quest_lat: float,
    quest_lng: float,
    joined_count: int,
    max_participants: int,
) -> CompatibilityScore:
    interest_points = INTEREST_WEIGHT if quest_category_key in user_interest_category_keys else round(
        INTEREST_WEIGHT * 0.2
    )

    if user_lat is None or user_lng is None:
        proximity_points = round(PROXIMITY_WEIGHT * 0.5)  # unknown location — neutral, not punished
    else:
        distance_km = haversine_km(user_lat, user_lng, quest_lat, quest_lng)
        if distance_km <= PROXIMITY_FULL_CREDIT_KM:
            proximity_points = PROXIMITY_WEIGHT
        elif distance_km >= PROXIMITY_ZERO_CREDIT_KM:
            proximity_points = 0
        else:
            span = PROXIMITY_ZERO_CREDIT_KM - PROXIMITY_FULL_CREDIT_KM
            proximity_points = round(PROXIMITY_WEIGHT * (1 - (distance_km - PROXIMITY_FULL_CREDIT_KM) / span))

    ratio = joined_count / max_participants if max_participants else 0
    if ratio <= 0:
        fill_points = round(FILL_WEIGHT * 0.4)  # nobody there yet — fine, just less social proof
    elif ratio >= 1:
        fill_points = 0  # full — not actually joinable
    else:
        fill_points = FILL_WEIGHT  # the sweet spot: some people, still room

    breakdown = [
        ScoreBreakdown("quest.compatCategory", interest_points),
        ScoreBreakdown("quest.compatLocation", proximity_points),
        ScoreBreakdown("quest.compatGroup", fill_points),
    ]
    return CompatibilityScore(score=interest_points + proximity_points + fill_points, breakdown=breakdown)
