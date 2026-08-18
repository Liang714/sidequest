from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, or_, select

from app.deps import CurrentUser, DbSession, RateLimit
from app.models.identity import Block, Friend, FriendStatus, User
from app.models.social import Notification
from app.schemas.friends import BlockCreate, FriendOut, FriendRequestCreate

router = APIRouter(tags=["friends"])


async def _existing_relationship(db: DbSession, a: UUID, b: UUID) -> Friend | None:
    result: Friend | None = await db.scalar(
        select(Friend).where(
            or_(
                and_(Friend.requester_id == a, Friend.addressee_id == b),
                and_(Friend.requester_id == b, Friend.addressee_id == a),
            )
        )
    )
    return result


@router.post("/friends/request", response_model=FriendOut, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: FriendRequestCreate, current_user: CurrentUser, db: DbSession, _rl: None = RateLimit("friend-request", 20)
) -> FriendOut:
    if body.addressee_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot friend yourself")

    addressee = await db.get(User, body.addressee_id)
    if addressee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    blocked = await db.scalar(
        select(Block).where(
            or_(
                and_(Block.blocker_id == current_user.id, Block.blocked_id == body.addressee_id),
                and_(Block.blocker_id == body.addressee_id, Block.blocked_id == current_user.id),
            )
        )
    )
    if blocked is not None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot friend a blocked user")

    existing = await _existing_relationship(db, current_user.id, body.addressee_id)
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "A friend relationship already exists")

    friend = Friend(requester_id=current_user.id, addressee_id=body.addressee_id)
    db.add(friend)
    db.add(
        Notification(
            user_id=body.addressee_id,
            type="friend_request_received",
            payload={"requester_username": current_user.username},
        )
    )
    await db.commit()
    return FriendOut(
        id=friend.id, user_id=addressee.id, username=addressee.username,
        display_name=addressee.username, status=friend.status,
    )


@router.post("/friends/{friend_id}/accept", response_model=FriendOut)
async def accept_friend_request(friend_id: UUID, current_user: CurrentUser, db: DbSession) -> FriendOut:
    friend = await db.get(Friend, friend_id)
    if friend is None or friend.addressee_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend request not found")
    if friend.status != FriendStatus.pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request is not pending")

    friend.status = FriendStatus.accepted
    db.add(
        Notification(
            user_id=friend.requester_id,
            type="friend_request_accepted",
            payload={"addressee_username": current_user.username},
        )
    )
    await db.commit()
    requester = await db.get(User, friend.requester_id)
    assert requester is not None
    return FriendOut(
        id=friend.id, user_id=requester.id, username=requester.username,
        display_name=requester.username, status=friend.status,
    )


@router.post("/friends/{friend_id}/remove", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(friend_id: UUID, current_user: CurrentUser, db: DbSession) -> None:
    friend = await db.get(Friend, friend_id)
    if friend is None or current_user.id not in (friend.requester_id, friend.addressee_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Friend relationship not found")
    await db.delete(friend)
    await db.commit()


@router.get("/friends", response_model=list[FriendOut])
async def list_friends(current_user: CurrentUser, db: DbSession) -> list[FriendOut]:
    rows = await db.scalars(
        select(Friend).where(
            or_(Friend.requester_id == current_user.id, Friend.addressee_id == current_user.id),
            Friend.status == FriendStatus.accepted,
        )
    )
    out = []
    for f in rows.all():
        other_id = f.addressee_id if f.requester_id == current_user.id else f.requester_id
        other = await db.get(User, other_id)
        if other:
            out.append(
                FriendOut(id=f.id, user_id=other.id, username=other.username, display_name=other.username, status=f.status)
            )
    return out


@router.get("/friends/requests", response_model=list[FriendOut])
async def list_incoming_requests(current_user: CurrentUser, db: DbSession) -> list[FriendOut]:
    rows = await db.scalars(
        select(Friend).where(Friend.addressee_id == current_user.id, Friend.status == FriendStatus.pending)
    )
    out = []
    for f in rows.all():
        requester = await db.get(User, f.requester_id)
        if requester:
            out.append(
                FriendOut(id=f.id, user_id=requester.id, username=requester.username, display_name=requester.username, status=f.status)
            )
    return out


@router.post("/blocks", status_code=status.HTTP_201_CREATED)
async def block_user(
    body: BlockCreate, current_user: CurrentUser, db: DbSession, _rl: None = RateLimit("block", 20)
) -> dict[str, Any]:
    if body.blocked_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot block yourself")

    existing = await _existing_relationship(db, current_user.id, body.blocked_id)
    if existing is not None:
        await db.delete(existing)

    already_blocked = await db.scalar(
        select(Block).where(Block.blocker_id == current_user.id, Block.blocked_id == body.blocked_id)
    )
    if already_blocked is None:
        db.add(Block(blocker_id=current_user.id, blocked_id=body.blocked_id))
    await db.commit()
    return {"blocked": True}
