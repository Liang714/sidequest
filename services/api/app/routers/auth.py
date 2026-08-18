import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.deps import CurrentUser, DbSession, RateLimit
from app.email.base import EmailProvider, EmailSendError
from app.email.service import get_email_provider
from app.email.templates import build_password_reset_email, build_verification_email
from app.models.identity import EmailToken, EmailTokenPurpose, Profile, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    VerifyEmailRequest,
)
from app.schemas.users import MeOut
from app.security import (
    InvalidTokenError,
    create_token,
    decode_token,
    generate_email_token,
    hash_email_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

EmailProviderDep = Annotated[EmailProvider, Depends(get_email_provider)]

# A hash of a password nobody will ever guess — verified against on every
# login attempt for an email that doesn't exist, so that path costs the
# same Argon2id work as a real wrong-password attempt. Without this, a
# nonexistent email short-circuits verify_password() entirely and returns
# measurably faster than a real email + wrong password, letting an
# attacker enumerate registered emails purely by timing. Generated once,
# not per-request — hashing at import time keeps the dummy comparison
# itself cheap; the constant multi-ms Argon2id cost is what matters, not
# what the dummy hash actually decodes to.
_DUMMY_PASSWORD_HASH = hash_password("this-hash-exists-only-to-equalize-login-timing")

_VERIFY_EMAIL_TTL = timedelta(hours=24)
_RESET_PASSWORD_TTL = timedelta(hours=1)


async def _issue_and_send_token(
    db: DbSession, provider: EmailProviderDep, *, user: User, purpose: EmailTokenPurpose
) -> None:
    """Shared by registration/resend-verification/forgot-password — issues
    a fresh single-use token and emails it. Best-effort on the send: a
    provider failure (unreachable, misconfigured, rate-limited) never
    fails the calling endpoint — the token still exists and a resend can
    always be requested, same "advisory, not a hard dependency" posture
    as every other external-provider call in this app.
    """
    raw_token, token_hash = generate_email_token()
    ttl = _VERIFY_EMAIL_TTL if purpose == EmailTokenPurpose.verify_email else _RESET_PASSWORD_TTL
    db.add(
        EmailToken(user_id=user.id, purpose=purpose, token_hash=token_hash, expires_at=datetime.now(UTC) + ttl)
    )
    await db.commit()

    base = get_settings().web_base_url
    locale = user.locale or "en"
    if purpose == EmailTokenPurpose.verify_email:
        message = build_verification_email(to=user.email, link=f"{base}/{locale}/verify-email?token={raw_token}")
    else:
        message = build_password_reset_email(to=user.email, link=f"{base}/{locale}/reset-password?token={raw_token}")

    try:
        await provider.send(message)
    except EmailSendError:
        logger.warning("Failed to send %s email to user_id=%s", purpose.value, user.id)


async def _consume_token(db: DbSession, *, raw_token: str, purpose: EmailTokenPurpose) -> User:
    token = await db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_email_token(raw_token),
            EmailToken.purpose == purpose,
        )
    )
    if token is None or token.used_at is not None or token.expires_at < datetime.now(UTC):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")

    user = await db.get(User, token.user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This link is invalid or has expired")

    token.used_at = datetime.now(UTC)
    return user


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest, db: DbSession, provider: EmailProviderDep, _rl: None = RateLimit("register", 5)
) -> TokenPair:
    user = User(
        email=body.email.lower(),
        username=body.username,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already taken") from exc

    db.add(Profile(user_id=user.id, display_name=body.display_name))
    await db.commit()

    # Never blocks registration — see _issue_and_send_token's docstring.
    await _issue_and_send_token(db, provider, user=user, purpose=EmailTokenPurpose.verify_email)

    return TokenPair(access_token=create_token(user.id, "access"), refresh_token=create_token(user.id, "refresh"))


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest, db: DbSession, _rl: None = RateLimit("login", 10)) -> TokenPair:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    # Always run password verification, even for a nonexistent user —
    # see _DUMMY_PASSWORD_HASH's docstring.
    password_ok = verify_password(body.password, user.password_hash if user else _DUMMY_PASSWORD_HASH)
    if user is None or not password_ok or user.deleted_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    return TokenPair(access_token=create_token(user.id, "access"), refresh_token=create_token(user.id, "refresh"))


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest, db: DbSession, _rl: None = RateLimit("refresh", 20)) -> TokenPair:
    try:
        user_id = decode_token(body.refresh_token, expected_type="refresh")
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token") from exc

    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    return TokenPair(access_token=create_token(user.id, "access"), refresh_token=create_token(user.id, "refresh"))


@router.get("/me", response_model=MeOut)
async def get_me(current_user: CurrentUser, db: DbSession) -> MeOut:
    profile = await db.get(Profile, current_user.id)
    assert profile is not None
    return MeOut(
        user_id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        locale=current_user.locale,
        is_admin=current_user.is_admin,
        email_verified=current_user.email_verified_at is not None,
        display_name=profile.display_name,
        real_name=profile.real_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        xp=profile.xp,
        level=profile.level,
    )


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(body: VerifyEmailRequest, db: DbSession) -> None:
    user = await _consume_token(db, raw_token=body.token, purpose=EmailTokenPurpose.verify_email)
    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(UTC)
    await db.commit()


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification(
    current_user: CurrentUser, db: DbSession, provider: EmailProviderDep, _rl: None = RateLimit("resend-verification", 5)
) -> None:
    if current_user.email_verified_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already verified")
    await _issue_and_send_token(db, provider, user=current_user, purpose=EmailTokenPurpose.verify_email)


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(
    body: ForgotPasswordRequest, db: DbSession, provider: EmailProviderDep, _rl: None = RateLimit("forgot-password", 5)
) -> None:
    """Always returns 204 regardless of whether the email is registered —
    the response never discloses that, so this can't be used to enumerate
    accounts by content. (Response *timing* still differs slightly — the
    registered-email path does a DB write and a provider call, the
    unregistered path doesn't — a smaller and more commonly-accepted
    residual gap than login's, which _DUMMY_PASSWORD_HASH closes
    completely; not worth the complexity of faking equivalent work here.)
    """
    user = await db.scalar(select(User).where(User.email == body.email.lower(), User.deleted_at.is_(None)))
    if user is not None:
        await _issue_and_send_token(db, provider, user=user, purpose=EmailTokenPurpose.reset_password)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(body: ResetPasswordRequest, db: DbSession) -> None:
    user = await _consume_token(db, raw_token=body.token, purpose=EmailTokenPurpose.reset_password)
    user.password_hash = hash_password(body.new_password)
    await db.commit()
