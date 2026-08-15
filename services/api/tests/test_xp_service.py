from app.services.xp_service import LEVEL_BASE_XP, LEVEL_XP_INCREMENT, compute_level


def test_zero_xp_is_level_one():
    state = compute_level(0)
    assert state.level == 1
    assert state.xp_into_level == 0
    assert state.xp_for_next_level == LEVEL_BASE_XP


def test_exact_threshold_advances_a_level():
    state = compute_level(LEVEL_BASE_XP)
    assert state.level == 2
    assert state.xp_into_level == 0


def test_partial_progress_into_a_level():
    state = compute_level(LEVEL_BASE_XP + 100)
    assert state.level == 2
    assert state.xp_into_level == 100
    assert state.xp_for_next_level == LEVEL_BASE_XP + LEVEL_XP_INCREMENT


def test_negative_xp_clamped_to_level_one():
    state = compute_level(-500)
    assert state.level == 1
    assert state.xp_into_level == 0


def test_thresholds_increase_each_level():
    # Each successive level should require strictly more XP than the last —
    # the "no artificial scarcity, but real progression" curve documented
    # in app/services/xp_service.py.
    thresholds = []
    total = 0
    for _ in range(5):
        state = compute_level(total)
        thresholds.append(state.xp_for_next_level)
        total += state.xp_for_next_level
    assert thresholds == sorted(thresholds)
    assert len(set(thresholds)) == len(thresholds)
