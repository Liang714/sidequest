"""Shared FastAPI dependencies: DB session, current user, Valkey, rate limiting."""

from typing import Annotated
from uuid import UUID

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.identity import User
from app.security import InvalidTokenError, decode_token

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]

_valkey_pool: redis.Redis | None = None


async def get_valkey() -> redis.Redis:
    global _valkey_pool
    if _valkey_pool is None:
        _valkey_pool = redis.from_url(settings.valkey_url, decode_responses=True)
    return _valkey_pool


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        user_id: UUID = decode_token(credentials.credentials, expected_type="access")
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc

    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not active")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def rate_limit(request: Request, key_suffix: str, limit_per_minute: int) -> None:
    """Fixed-window limiter keyed by user (if authenticated) or client IP.

    Deliberately simple (fixed window, not sliding/token-bucket) — the
    behavioral contract from docs/SECURITY.md is "mutating endpoints are
    rate-limited," not a specific algorithm; this is the cheapest thing
    that satisfies it correctly.
    """
    client = getattr(request.state, "user_id", None) or (request.client.host if request.client else "anon")
    vk = await get_valkey()
    key = f"ratelimit:{key_suffix}:{client}"
    count = await vk.incr(key)
    if count == 1:
        await vk.expire(key, 60)
    if count > limit_per_minute:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded")
