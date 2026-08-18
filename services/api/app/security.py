"""Password hashing (Argon2id — OWASP's current recommendation) and JWT
issuance/verification.

Tokens are self-issued for now (see docs/AI.md-style provider-abstraction
pattern applied to auth): the seam is "verify a JWT and read `sub`/`scope`
claims," which is exactly what verifying a Supabase-issued JWT would look
like too — swapping providers later doesn't change any call site, only
this module. See docs/ARCHITECTURE.md for the target state.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

settings = get_settings()
_hasher = PasswordHasher()

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_token(user_id: UUID, token_type: TokenType) -> str:
    now = datetime.now(UTC)
    ttl = (
        timedelta(minutes=settings.access_token_ttl_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_ttl_days)
    )
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "iat": now,
        "exp": now + ttl,
    }
    return jwt.encode(payload, settings.jwt_signing_secret, algorithm=settings.jwt_algorithm)


class InvalidTokenError(Exception):
    pass


def decode_token(token: str, expected_type: TokenType) -> UUID:
    try:
        payload = jwt.decode(token, settings.jwt_signing_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    if payload.get("type") != expected_type:
        raise InvalidTokenError(f"expected a {expected_type} token")

    try:
        return UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("malformed subject claim") from exc


def generate_email_token() -> tuple[str, str]:
    """Returns (raw_token, token_hash) for email verification / password
    reset (app/models/identity.py::EmailToken, app/routers/auth.py). The
    raw value goes in the emailed link and is never stored — only its
    SHA-256 hash is, so a DB leak alone can't hand out usable tokens
    (same reasoning as password_hash never storing the real password;
    SHA-256 rather than Argon2id here since this is a high-entropy random
    token being looked up by exact hash match, not a low-entropy secret
    someone could brute-force offline — Argon2id's slow-by-design cost
    would just be wasted work on every verify/reset request)."""
    raw_token = secrets.token_urlsafe(32)
    return raw_token, hash_email_token(raw_token)


def hash_email_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()
