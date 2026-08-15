"""Quest room chat — REST history + WebSocket. See docs/API.md §Quest rooms.

The WebSocket also publishes each message to a `quest_room:{id}` Valkey
channel. Locally (one server process) that publish is inert — delivery to
connected clients happens via the in-process ConnectionManager below. It's
the real integration point docs/ARCHITECTURE.md's "Valkey pub/sub fans
messages out across API instances" describes; wiring a subscriber loop
that forwards *other* instances' publishes to local sockets is what
turns this from single-instance into horizontally scalable, deferred to
when there's a second instance to test it against (Phase 9).
"""

import json
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select

from app.db import SessionLocal
from app.deps import CurrentUser, DbSession, get_valkey
from app.models.identity import User
from app.models.quests import ParticipantStatus, Quest, QuestParticipant
from app.models.social import Message
from app.schemas.chat import MessageOut
from app.security import InvalidTokenError, decode_token

router = APIRouter(tags=["chat"])


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, quest_id: UUID, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms[quest_id].add(ws)

    def disconnect(self, quest_id: UUID, ws: WebSocket) -> None:
        self._rooms[quest_id].discard(ws)

    async def broadcast(self, quest_id: UUID, payload: dict[str, Any]) -> None:
        dead = []
        for ws in self._rooms.get(quest_id, ()):
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001 — best-effort fan-out; one dead
                # socket (any failure mode: closed, reset, ...) must not
                # break delivery to the rest of the room.
                dead.append(ws)
        for ws in dead:
            self.disconnect(quest_id, ws)


manager = ConnectionManager()


async def _require_participant(db: DbSession, quest_id: UUID, user_id: UUID) -> None:
    quest = await db.get(Quest, quest_id)
    if quest is None or quest.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quest not found")
    participant = await db.scalar(
        select(QuestParticipant).where(
            QuestParticipant.quest_id == quest_id,
            QuestParticipant.user_id == user_id,
            QuestParticipant.status != ParticipantStatus.left,
        )
    )
    is_host = quest.creator_id == user_id
    if participant is None and not is_host:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You're not in this quest's room")


@router.get("/quests/{quest_id}/messages", response_model=list[MessageOut])
async def list_messages(
    quest_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(default=50, le=200, ge=1),
) -> list[MessageOut]:
    await _require_participant(db, quest_id, current_user.id)

    rows = await db.execute(
        select(Message, User.username)
        .join(User, User.id == Message.sender_id)
        .where(Message.quest_id == quest_id, Message.deleted_at.is_(None))
        .order_by(Message.created_at.asc())
        .limit(limit)
    )
    return [
        MessageOut(
            id=m.id, quest_id=m.quest_id, sender_id=m.sender_id, sender_username=username,
            content=m.content, created_at=m.created_at,
        )
        for m, username in rows.all()
    ]


@router.websocket("/ws/quests/{quest_id}")
async def quest_room_ws(websocket: WebSocket, quest_id: UUID, token: str = Query(...)) -> None:
    try:
        user_id = decode_token(token, expected_type="access")
    except InvalidTokenError:
        await websocket.close(code=4401)
        return

    async with SessionLocal() as db:
        user = await db.get(User, user_id)
        if user is None:
            await websocket.close(code=4401)
            return
        try:
            await _require_participant(db, quest_id, user_id)
        except HTTPException:
            await websocket.close(code=4403)
            return

    await manager.connect(quest_id, websocket)
    vk = await get_valkey()
    try:
        while True:
            raw = await websocket.receive_json()
            if raw.get("type") == "message.send":
                content = str(raw.get("content", "")).strip()
                if not content:
                    continue
                async with SessionLocal() as db:
                    message = Message(quest_id=quest_id, sender_id=user_id, content=content[:2000])
                    db.add(message)
                    await db.commit()
                    await db.refresh(message)

                payload = {
                    "type": "message.new",
                    "message": {
                        "id": str(message.id),
                        "sender_id": str(user_id),
                        "sender_username": user.username,
                        "content": message.content,
                        "created_at": message.created_at.isoformat(),
                    },
                }
                await manager.broadcast(quest_id, payload)
                await vk.publish(f"quest_room:{quest_id}", json.dumps(payload))
            elif raw.get("type") == "objective.complete":
                await manager.broadcast(
                    quest_id,
                    {"type": "objective.updated", "objective_id": raw.get("objective_id"), "completed_by": [str(user_id)]},
                )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(quest_id, websocket)
