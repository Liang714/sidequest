"""FastAPI app factory. See docs/ARCHITECTURE.md for the module map this
router list mirrors, and docs/API.md for the endpoint reference."""

from pathlib import Path
from typing import Any

import sentry_sdk
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import (
    ai,
    auth,
    bookings,
    business,
    chat,
    creators,
    friends,
    gamification,
    moderation,
    notifications,
    quests,
    subscriptions,
    users,
)

settings = get_settings()

# A deployment that's still running the dev-only placeholder secret would
# accept/sign JWTs anyone could forge (the value is public — it's right
# there in .env.example and every doc that quotes it) — refuse to boot
# rather than silently run a production API with a known signing key.
_INSECURE_DEV_SECRET = "dev-only-insecure-secret-change-me"
if settings.app_env == "production" and settings.jwt_signing_secret == _INSECURE_DEV_SECRET:
    raise RuntimeError(
        "APP_ENV=production but JWT_SIGNING_SECRET is still the insecure dev default — "
        "set a real secret (e.g. `openssl rand -hex 32`) via `fly secrets set`, see docs/DEPLOYMENT.md."
    )

# True no-op without a DSN — sentry_sdk.init() is never called at all, not
# just configured to send nowhere. See docs/DEPLOYMENT.md for getting a
# real DSN; SENTRY_DSN unset (the default) is a fully supported, expected
# state, not a degraded one.
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        # Errors are always captured; this is the % of ordinary
        # request *traces* also sent for performance monitoring — kept
        # low since that's a nice-to-have, not the reason this exists.
        traces_sample_rate=0.1,
    )

app = FastAPI(
    title="SIDEQUEST API",
    version="0.1.0",
    root_path="/api/v1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next: Any) -> Response:
    """Defense-in-depth headers with no real downside for a JSON API (plus
    the /local-storage static mount and /docs Swagger UI, both of which
    these still apply to correctly). Not a CSP: this API doesn't serve
    app HTML — that's apps/web's job, on a separate origin/deploy — and a
    misconfigured CSP risks breaking the interactive Swagger UI for no
    real gain here.
    """
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Serves whatever LocalDiskStorageProvider.save() writes, at exactly the
# path LocalDiskStorageProvider.public_url() promises (see app/storage.py).
# Only relevant while storage_provider is local disk — a real S3/R2
# adapter would serve photos from its own CDN URL instead, no mount
# needed. mkdir here so a fresh deploy's Fly volume (empty on first boot)
# doesn't 500 StaticFiles before anything's ever been uploaded to it.
Path(settings.storage_local_dir).mkdir(parents=True, exist_ok=True)
app.mount("/local-storage", StaticFiles(directory=settings.storage_local_dir), name="local-storage")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(quests.router)
app.include_router(friends.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(gamification.router)
app.include_router(moderation.router)
app.include_router(ai.router)
app.include_router(business.router)
app.include_router(subscriptions.router)
app.include_router(creators.router)
app.include_router(bookings.router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, Any]:
    return {"status": "ok"}
