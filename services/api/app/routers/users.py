import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import Select, delete, func, or_, select

from app.deps import CurrentUser, DbSession, RateLimit
from app.models.gamification import UserAchievement
from app.models.identity import Block, Friend, FriendStatus, Interest, Profile, User, UserInterest
from app.models.quests import QuestParticipant
from app.schemas.users import (
    AccountDeleteRequest,
    InterestOut,
    ProfileOut,
    ProfileUpdate,
    PublicProfileOut,
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
        select(Interest)
        .join(UserInterest, UserInterest.interest_id == Interest.id)
        .where(UserInterest.user_id == current_user.id)
    )
    return [InterestOut.model_validate(r) for r in rows.all()]


@router.patch("/users/me", response_model=ProfileOut)
async def update_my_profile(
    body: ProfileUpdate, current_user: CurrentUser, db: DbSession
) -> ProfileOut:
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


@router.get("/users/{user_id}", response_model=PublicProfileOut)
async def get_user_profile(
    user_id: UUID, current_user: CurrentUser, db: DbSession
) -> PublicProfileOut:
    """Another user's public profile.

    This is the screen that makes the app's social half work at all: until
    it existed there was no way to obtain another user's id, so
    POST /friends/request — a Must story — could never be reached from the
    UI. It is also the vetting surface that presence depends on; see
    docs/superpowers/specs/2026-08-27-crew-ui-design.md §F2.
    """
    user = await db.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    profile = await db.get(Profile, user_id)
    assert profile is not None

    is_self = user_id == current_user.id

    # A block hides both directions — neither party can look the other up.
    if not is_self:
        blocked = await db.scalar(
            select(func.count())
            .select_from(Block)
            .where(
                or_(
                    (Block.blocker_id == current_user.id) & (Block.blocked_id == user_id),
                    (Block.blocker_id == user_id) & (Block.blocked_id == current_user.id),
                )
            )
        )
        if blocked:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    friend_row = None
    if not is_self:
        friend_row = await db.scalar(
            select(Friend).where(
                or_(
                    (Friend.requester_id == current_user.id) & (Friend.addressee_id == user_id),
                    (Friend.requester_id == user_id) & (Friend.addressee_id == current_user.id),
                )
            )
        )
    is_friend = friend_row is not None and friend_row.status == FriendStatus.accepted
    pending = friend_row is not None and friend_row.status == FriendStatus.pending

    visibility = profile.visibility_settings or {}
    real_name = profile.real_name if (is_self or visibility.get("real_name") == "public") else None

    # USER_STORIES.md "set my profile to public or friends-only" (Must) was
    # specced but never implemented — visibility_settings only gated
    # real_name. A friends-only profile now returns an identity-sized view so
    # a stranger can still send a request, but learns nothing else.
    restricted = not is_self and not is_friend and visibility.get("profile") == "friends"
    if restricted:
        return PublicProfileOut(
            user_id=user.id,
            username=user.username,
            display_name=profile.display_name,
            real_name=None,
            bio=None,
            avatar_url=profile.avatar_url,
            xp=0,
            level=profile.level,
            is_friend=is_friend,
            friend_request_pending=pending,
            restricted=True,
        )

    interest_rows = await db.scalars(
        select(Interest.key)
        .join(UserInterest, UserInterest.interest_id == Interest.id)
        .where(UserInterest.user_id == user_id)
        .order_by(Interest.key)
    )

    completed = await db.scalar(
        select(func.count())
        .select_from(QuestParticipant)
        .where(QuestParticipant.user_id == user_id, QuestParticipant.completed_at.is_not(None))
    )
    achievements = await db.scalar(
        select(func.count()).select_from(UserAchievement).where(UserAchievement.user_id == user_id)
    )

    shared_quests = 0
    mutual_friends = 0
    if not is_self:
        # Quests both people actually finished — behaviour, not appearance.
        mine = select(QuestParticipant.quest_id).where(
            QuestParticipant.user_id == current_user.id, QuestParticipant.completed_at.is_not(None)
        )
        shared_quests = (
            await db.scalar(
                select(func.count())
                .select_from(QuestParticipant)
                .where(
                    QuestParticipant.user_id == user_id,
                    QuestParticipant.completed_at.is_not(None),
                    QuestParticipant.quest_id.in_(mine),
                )
            )
            or 0
        )

        def accepted_friend_ids(uid: UUID) -> Select[tuple[UUID]]:
            return select(
                func.coalesce(func.nullif(Friend.requester_id, uid), Friend.addressee_id).label(
                    "other_id"
                )
            ).where(
                Friend.status == FriendStatus.accepted,
                or_(Friend.requester_id == uid, Friend.addressee_id == uid),
            )

        theirs = accepted_friend_ids(user_id).subquery()
        mine_friends = accepted_friend_ids(current_user.id).subquery()
        mutual_friends = (
            await db.scalar(
                select(func.count())
                .select_from(theirs)
                .where(theirs.c.other_id.in_(select(mine_friends.c.other_id)))
            )
            or 0
        )

    return PublicProfileOut(
        user_id=user.id,
        username=user.username,
        display_name=profile.display_name,
        real_name=real_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        xp=profile.xp,
        level=profile.level,
        interests=list(interest_rows.all()),
        completed_quests=completed or 0,
        achievements_unlocked=achievements or 0,
        shared_quests=shared_quests,
        mutual_friends=mutual_friends,
        is_friend=is_friend,
        friend_request_pending=pending,
        restricted=False,
    )


@router.post("/users/me/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    body: AccountDeleteRequest,
    current_user: CurrentUser,
    db: DbSession,
    _rl: None = RateLimit("account-delete", 5),
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
