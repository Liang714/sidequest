from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str

    model_config = {"str_strip_whitespace": True}


class MessageOut(BaseModel):
    id: UUID
    quest_id: UUID
    sender_id: UUID
    sender_username: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: UUID
    type: str
    payload: dict[str, Any]
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
