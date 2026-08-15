from fastapi import APIRouter
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.gamification import Achievement, UserAchievement
from app.models.identity import Profile
from app.schemas.gamification import AchievementOut, XpSummaryOut
from app.services.xp_service import compute_level

router = APIRouter(prefix="/users/me", tags=["gamification"])


@router.get("/xp", response_model=XpSummaryOut)
async def get_my_xp(current_user: CurrentUser, db: DbSession) -> XpSummaryOut:
    profile = await db.get(Profile, current_user.id)
    assert profile is not None
    level_state = compute_level(profile.xp)
    return XpSummaryOut(
        xp=profile.xp,
        level=level_state.level,
        xp_into_level=level_state.xp_into_level,
        xp_for_next_level=level_state.xp_for_next_level,
    )


@router.get("/achievements", response_model=list[AchievementOut])
async def get_my_achievements(current_user: CurrentUser, db: DbSession) -> list[AchievementOut]:
    rows = await db.execute(
        select(Achievement, UserAchievement.unlocked_at)
        .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
        .where(UserAchievement.user_id == current_user.id)
        .order_by(UserAchievement.unlocked_at.desc())
    )
    return [
        AchievementOut(key=achievement.key, icon=achievement.icon, unlocked_at=unlocked_at)
        for achievement, unlocked_at in rows.all()
    ]
