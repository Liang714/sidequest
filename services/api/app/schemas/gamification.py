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
    unlocked_at: datetime

    model_config = {"from_attributes": True}
