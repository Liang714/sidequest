from fastapi import APIRouter
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.gamification import Achievement, UserAchievement
from app.models.identity import Profile
from app.schemas.gamification import AchievementOut, XpSummaryOut
from app.services import analytics_service
from app.services.xp_service import compute_level

router = APIRouter(prefix="/users/me", tags=["gamification"])


@router.get("/xp", response_model=XpSummaryOut)
async def get_my_xp(current_user: CurrentUser, db: DbSession) -> XpSummaryOut:
    profile = await db.get(Profile, current_user.id)
    assert profile is not None
    level_state = compute_level(profile.xp)
    # The profile page always fetches this first — a reasonable proxy for
    # "viewed their stats" without a dedicated frontend beacon. See
    # app/models/analytics.py for why this is a local table, not PostHog yet.
    analytics_service.log_event(db, event_type="profile_stats_viewed", user_id=current_user.id)
    await db.commit()
    return XpSummaryOut(
        xp=profile.xp,
        level=level_state.level,
        xp_into_level=level_state.xp_into_level,
        xp_for_next_level=level_state.xp_for_next_level,
    )


@router.get("/achievements", response_model=list[AchievementOut])
async def get_my_achievements(current_user: CurrentUser, db: DbSession) -> list[AchievementOut]:
    """Returns the full achievement gallery — locked and unlocked — so the
    profile page can show what's still to earn, not just a trophy case.
    Unlocked achievements sort first (most recent unlock first); locked
    ones follow in a stable alphabetical order."""
    rows = await db.execute(
        select(Achievement, UserAchievement.unlocked_at).outerjoin(
            UserAchievement,
            (UserAchievement.achievement_id == Achievement.id) & (UserAchievement.user_id == current_user.id),
        )
    )
    results = [
        AchievementOut(key=a.key, icon=a.icon, unlocked=unlocked_at is not None, unlocked_at=unlocked_at)
        for a, unlocked_at in rows.all()
    ]
    results.sort(key=lambda r: (not r.unlocked, -(r.unlocked_at.timestamp() if r.unlocked_at else 0), r.key))
    return results
