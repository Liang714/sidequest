"""Shared FastAPI dependencies: DB session, current user, Valkey, rate limiting."""

import logging
from typing import Annotated, Any
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
    request: Request,
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
    # rate_limit() below keys off this when present, so authenticated users
    # get a per-user bucket instead of sharing whatever IP a NAT/proxy
    # makes everyone look like (see rate_limit()'s docstring).
    request.state.user_id = str(user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_admin(current_user: CurrentUser) -> User:
    """Gate for the small `/admin/*` surface (business verification today —
    see app/routers/business.py). There's no admin signup flow; the flag is
    set via `uv run python -m app.make_admin <email>`."""
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return current_user


CurrentAdmin = Annotated[User, Depends(get_current_admin)]


async def check_rate_limit(key: str, limit_per_minute: int) -> bool:
    """Core fixed-window check, Valkey-backed — returns True if the caller
    is within limit. Split out from rate_limit() below so both the normal
    HTTP-request path and the WebSocket message loop (app/routers/chat.py
    — a WebSocket has no `Request` to key off of) can share one
    implementation instead of two.

    Fails open, not closed: if Valkey itself is unreachable, a real
    outage there shouldn't take down every mutating endpoint in the app —
    logged as a warning so it's visible without becoming a second point
    of failure for the whole API.
    """
    try:
        vk = await get_valkey()
        count = await vk.incr(key)
        if count == 1:
            await vk.expire(key, 60)
    except redis.RedisError:
        logging.getLogger(__name__).warning("rate_limit: Valkey unreachable, failing open for key=%s", key)
        return True
    return count <= limit_per_minute


async def rate_limit(request: Request, key_suffix: str, limit_per_minute: int) -> None:
    """Fixed-window limiter keyed by user (if authenticated — see
    get_current_user, which sets request.state.user_id) or client IP.

    Deliberately simple (fixed window, not sliding/token-bucket) — the
    behavioral contract from docs/SECURITY.md is "mutating endpoints are
    rate-limited," not a specific algorithm; this is the cheapest thing
    that satisfies it correctly.
    """
    client = getattr(request.state, "user_id", None) or (request.client.host if request.client else "anon")
    if not await check_rate_limit(f"ratelimit:{key_suffix}:{client}", limit_per_minute):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded")


def RateLimit(key_suffix: str, limit_per_minute: int) -> Any:
    """Dependency factory — use as a parameter default:

        async def endpoint(..., _rl: None = RateLimit("login", 10)): ...

    `rate_limit()` itself takes extra args FastAPI can't inject directly
    from a bare `Depends(rate_limit)`, so this binds them at router-definition
    time via a closure instead of needing a partial/lambda at every call site.
    """

    async def _dep(request: Request) -> None:
        await rate_limit(request, key_suffix, limit_per_minute)

    return Depends(_dep)
