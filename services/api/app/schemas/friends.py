from uuid import UUID

from pydantic import BaseModel

from app.models.identity import FriendStatus


class FriendRequestCreate(BaseModel):
    addressee_id: UUID


class FriendOut(BaseModel):
    id: UUID
    user_id: UUID
    username: str
    display_name: str
    status: FriendStatus

    model_config = {"from_attributes": True}


class BlockCreate(BaseModel):
    blocked_id: UUID
