import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select

from app.deps import CurrentUser, DbSession, RateLimit
from app.models.identity import Interest, Profile, User, UserInterest
from app.schemas.users import (
    AccountDeleteRequest,
    InterestOut,
    ProfileOut,
    ProfileUpdate,
    SetInterestsRequest,
)
from app.security import hash_password, verify_password

router = APIRouter(tags=["users"])


@router.get("/interests", response_model=list[InterestOut])
async def list_interests(db: DbSession) -> list[InterestOut]:
    rows = await db.scalars(select(Interest).order_by(Interest.category, Interest.key))
    return [InterestOut.model_validate(r) for r in rows.all()]


@router.put("/users/me/interests", response_model=list[InterestOut])
async def set_my_interests(
    body: SetInterestsRequest, current_user: CurrentUser, db: DbSession
) -> list[InterestOut]:
    await db.execute(delete(UserInterest).where(UserInterest.user_id == current_user.id))
    for interest_id in body.interest_ids:
        db.add(UserInterest(user_id=current_user.id, interest_id=interest_id))
    await db.commit()

    rows = await db.scalars(
        select(Interest).join(UserInterest, UserInterest.interest_id == Interest.id).where(
            UserInterest.user_id == current_user.id
        )
    )
    return [InterestOut.model_validate(r) for r in rows.all()]


@router.patch("/users/me", response_model=ProfileOut)
async def update_my_profile(body: ProfileUpdate, current_user: CurrentUser, db: DbSession) -> ProfileOut:
    profile = await db.get(Profile, current_user.id)
    assert profile is not None
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return ProfileOut(
        user_id=current_user.id,
        username=current_user.username,
        display_name=profile.display_name,
        real_name=profile.real_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        xp=profile.xp,
        level=profile.level,
    )


@router.get("/users/{user_id}", response_model=ProfileOut)
async def get_user_profile(user_id: UUID, current_user: CurrentUser, db: DbSession) -> ProfileOut:
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    profile = await db.get(Profile, user_id)
    assert profile is not None

    visibility = profile.visibility_settings or {}
    is_self = user_id == current_user.id
    real_name = profile.real_name if (is_self or visibility.get("real_name") == "public") else None

    return ProfileOut(
        user_id=user.id,
        username=user.username,
        display_name=profile.display_name,
        real_name=real_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        xp=profile.xp,
        level=profile.level,
    )


@router.post("/users/me/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    body: AccountDeleteRequest, current_user: CurrentUser, db: DbSession, _rl: None = RateLimit("account-delete", 5)
) -> None:
    """Self-service account deletion — soft delete, same as every other
    "deleted" thing in this app (see docs/SECURITY.md: a moderation
    investigation may still need the record). email/username get mangled
    to a value nobody could register, freeing the *original* ones up for
    reuse (both columns are unique-constrained) rather than permanently
    squatting them on an account nobody can ever log into again.
    password_hash is overwritten with an unusable random value too — belt
    and suspenders on top of the deleted_at check every auth path already
    does, not a substitute for it.
    """
    if not verify_password(body.password, current_user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect password")

    current_user.deleted_at = datetime.now(UTC)
    current_user.email = f"deleted-{current_user.id}@deleted.sidequest.invalid"
    current_user.username = f"deleted-{current_user.id}"
    current_user.password_hash = hash_password(secrets.token_urlsafe(32))
    await db.commit()
