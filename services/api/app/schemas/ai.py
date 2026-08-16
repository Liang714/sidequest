from pydantic import BaseModel, Field


class GenerateQuestRequest(BaseModel):
    free_text: str = Field(min_length=1, max_length=500)
    city: str = "Seoul"
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class GeneratedQuestOut(BaseModel):
    generation_id: str
    title: str
    description: str
    category_key: str
    difficulty: str
    duration_minutes: int
    budget_amount: float | None
    xp_reward: int
    objectives: list[str]
    provider: str
