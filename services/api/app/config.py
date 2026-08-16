"""Settings — see docs/ARCHITECTURE.md and .env.example at the repo root.

Reads process env vars first; falls back to a local .env (services/api/.env,
gitignored) or the repo-root .env for convenience running `uvicorn` from
either directory.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", str(_REPO_ROOT_ENV)),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_port: int = 8000

    database_url: str = "postgresql+asyncpg://sidequest:sidequest@localhost:5432/sidequest"
    valkey_url: str = "redis://localhost:6379/0"

    # Object storage — falls back to local disk when unset (see app/storage.py).
    # Set storage_endpoint to point at real MinIO/R2 when that's available.
    storage_endpoint: str | None = None
    storage_bucket: str = "sidequest-dev"
    storage_access_key_id: str = "minioadmin"
    storage_secret_access_key: str = "minioadmin"
    storage_local_dir: str = "./.local-storage"

    jwt_signing_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 30

    rate_limit_default_per_minute: int = 60

    cors_origins: list[str] = ["http://localhost:3000"]

    # AI — see docs/AI.md. "ollama" (a local, free, self-hosted model) is
    # the dev default, same posture as storage/DB: production-grade
    # architecture, local/free equivalents until there's a reason to pay.
    # Set ai_provider=anthropic + anthropic_api_key to use Claude instead —
    # no other code changes needed, see app/ai/service.py.
    ai_provider: str = "ollama"
    ollama_host: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:8b"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"

    # Payments — see docs/ROADMAP.md Phase 6 and app/payments/. "fake"
    # (no real money, always succeeds) is the dev/test default, same
    # posture as everything else here — a real Stripe/Toss key is opt-in,
    # never required to develop or test against.
    payment_provider: str = "fake"
    stripe_secret_key: str | None = None
    toss_secret_key: str | None = None

    # Bookings — see docs/ROADMAP.md Phase 7 and app/bookings/. "fake" is
    # both the dev default and, today, the only implementation — no real
    # vendor was ever named in Phase 0. Kept env-var-driven anyway so a
    # real one is a config change later, same promise as ai_provider/
    # payment_provider above.
    booking_provider: str = "fake"


@lru_cache
def get_settings() -> Settings:
    return Settings()
