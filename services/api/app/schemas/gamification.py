from datetime import datetime

from pydantic import BaseModel


class XpSummaryOut(BaseModel):
    xp: int
    level: int
    xp_into_level: int
    xp_for_next_level: int


class AchievementOut(BaseModel):
    key: str
    icon: str
    unlocked: bool
    # None when the achievement is still locked — GET /users/me/achievements
    # returns the full gallery (locked + unlocked) so the profile page can
    # show what's still to earn, not just a trophy case of what's already won.
    unlocked_at: datetime | None = None

    model_config = {"from_attributes": True}
