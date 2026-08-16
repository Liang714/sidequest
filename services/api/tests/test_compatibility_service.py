from app.services.compatibility_service import compute_compatibility

SEOUL = (37.5665, 126.9780)


def _score(**overrides):
    defaults = {
        "user_interest_category_keys": {"gaming"},
        "quest_category_key": "gaming",
        "user_lat": SEOUL[0],
        "user_lng": SEOUL[1],
        "quest_lat": SEOUL[0],
        "quest_lng": SEOUL[1],
        "joined_count": 1,
        "max_participants": 4,
    }
    return compute_compatibility(**{**defaults, **overrides})


def test_matching_interest_scores_higher_than_no_match():
    matching = _score(quest_category_key="gaming")
    not_matching = _score(quest_category_key="cafe")
    assert matching.score > not_matching.score


def test_closer_quest_scores_higher_than_far_quest():
    close = _score(quest_lat=SEOUL[0], quest_lng=SEOUL[1])
    # ~50km away
    far = _score(quest_lat=SEOUL[0] + 0.45, quest_lng=SEOUL[1])
    assert close.score > far.score


def test_unknown_location_is_neutral_not_punished():
    known_far = _score(quest_lat=SEOUL[0] + 0.45, quest_lng=SEOUL[1])
    unknown = _score(user_lat=None, user_lng=None)
    assert unknown.score > known_far.score


def test_full_quest_gets_no_fill_credit():
    sweet_spot = _score(joined_count=2, max_participants=4)
    full = _score(joined_count=4, max_participants=4)
    assert sweet_spot.score > full.score


def test_score_is_bounded_and_breakdown_sums_to_score():
    result = _score()
    assert 0 <= result.score <= 100
    assert sum(b.points for b in result.breakdown) == result.score
