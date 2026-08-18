from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileOut(BaseModel):
    user_id: UUID
    username: str
    display_name: str
    real_name: str | None
    bio: str | None
    avatar_url: str | None
    xp: int
    level: int

    model_config = {"from_attributes": True}


class MeOut(ProfileOut):
    email: str
    locale: str
    is_admin: bool = False
    email_verified: bool = False


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    real_name: str | None = None
    bio: str | None = Field(default=None, max_length=280)
    avatar_url: str | None = None
    birth_date: date | None = None
    visibility_settings: dict[str, Any] | None = None


class InterestOut(BaseModel):
    id: UUID
    key: str
    category: str

    model_config = {"from_attributes": True}


class SetInterestsRequest(BaseModel):
    interest_ids: list[UUID]


class AccountDeleteRequest(BaseModel):
    # Requires re-entering the password, not just "you're already logged
    # in" — standard friction for an irreversible, destructive action
    # (e.g. a shared/left-open session shouldn't be enough on its own).
    password: str
