"""FastAPI app factory. See docs/ARCHITECTURE.md for the module map this
router list mirrors, and docs/API.md for the endpoint reference."""

from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, chat, friends, gamification, moderation, notifications, quests, users

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

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(quests.router)
app.include_router(friends.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(gamification.router)
app.include_router(moderation.router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, Any]:
    return {"status": "ok"}
