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


class PublicProfileOut(ProfileOut):
    """Another user's profile, as seen by the current user.

    Everything here is interest-, behaviour- or graph-derived. There is
    deliberately no appearance-oriented field, no last-seen and no
    profile-view count: PRD.md §6 rules out appearance-based matching, and
    the UI satisfies that by not having the data rather than by choosing not
    to render it. See docs/superpowers/specs/2026-08-27-crew-ui-design.md §F2.
    """

    interests: list[str] = []
    completed_quests: int = 0
    achievements_unlocked: int = 0
    #: Quests both users completed. The strongest available vetting signal,
    #: and it costs one join to compute.
    shared_quests: int = 0
    mutual_friends: int = 0
    is_friend: bool = False
    friend_request_pending: bool = False
    #: True when the owner set their profile to friends-only and the viewer
    #: isn't a friend. Detail fields are emptied rather than 404'd, so the
    #: viewer can still send a friend request.
    restricted: bool = False


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
