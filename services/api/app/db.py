"""Async SQLAlchemy engine/session. See docs/DATABASE.md for schema/conventions."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Shared declarative base — every module's models import this.

    `type_annotation_map` makes every bare `Mapped[datetime]` resolve to
    TIMESTAMPTZ by default — the app always works in aware UTC datetimes
    (see _now() usage throughout), so a naive-by-default column is a bug
    waiting to happen (asyncpg rejects aware→naive inserts outright, which
    is how this was caught rather than silently truncating tzinfo).
    """

    type_annotation_map: ClassVar[dict[type, Any]] = {datetime: DateTime(timezone=True)}


def _uuid7() -> UUID:
    """UUIDv7 (time-ordered) primary keys — see docs/DATABASE.md conventions.

    Python's stdlib uuid module doesn't gain uuid7() until 3.14 (this
    project targets 3.13), so this constructs one manually: a 48-bit
    millisecond timestamp followed by random bits, per RFC 9562.
    """
    import os
    import time

    ms = int(time.time() * 1000).to_bytes(6, "big")
    rand = bytearray(os.urandom(10))
    rand[0] = (rand[0] & 0x0F) | 0x70  # version 7
    rand[2] = (rand[2] & 0x3F) | 0x80  # variant 10
    return UUID(bytes=bytes(ms) + bytes(rand))


class UUIDPrimaryKeyMixin:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=_uuid7)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
