"""FastAPI app factory. See docs/ARCHITECTURE.md for the module map this
router list mirrors, and docs/API.md for the endpoint reference."""

from pathlib import Path
from typing import Any

from fastapi import FastAPI
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
