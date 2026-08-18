"""Settings — see docs/ARCHITECTURE.md and .env.example at the repo root.

Reads process env vars first; falls back to a local .env (services/api/.env,
gitignored) or the repo-root .env for convenience running `uvicorn` from
either directory.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# `parents[3]` from services/api/app/config.py reaches the monorepo root
# in local dev (app -> api -> services -> sidequest). Found live on the
# first real Fly.io deploy: the Docker image's directory layout is much
# shallower (/app/app/config.py has only 2 real parents above it), so a
# fixed index crashes with IndexError there instead of just harmlessly
# not finding a repo-root .env to fall back to. Clamp to whatever's
# actually available — in the container this resolves to "/.env", which
# simply doesn't exist and gets skipped by pydantic-settings exactly like
# any other missing optional env_file, no crash either way.
_config_parents = Path(__file__).resolve().parents
_REPO_ROOT_ENV = (_config_parents[3] if len(_config_parents) > 3 else _config_parents[-1]) / ".env"


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

    # Object storage — see app/storage.py. "local" (a Fly volume in
    # production, a plain dir in dev) is both the dev default and the
    # production-safe default until a real bucket exists. Set
    # STORAGE_PROVIDER=s3 + the rest of these for real Cloudflare R2/MinIO/S3.
    storage_provider: str = "local"
    storage_endpoint: str | None = None
    storage_bucket: str = "sidequest-dev"
    storage_access_key_id: str = "minioadmin"
    storage_secret_access_key: str = "minioadmin"
    storage_public_base_url: str | None = None
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

    # Vision verification — see docs/ROADMAP.md Phase 8 and app/vision/.
    # "ollama" (llava:7b, local, free) is both the dev default and, today,
    # the only implementation. Advisory only — see
    # services/api/scripts/measure_vision_accuracy.py and docs/AI.md
    # §VisionVerifier for why it doesn't gate XP awards.
    vision_provider: str = "ollama"
    ollama_vision_model: str = "llava:7b"

    # Email — see docs/SECURITY.md §Security review and app/email/. "fake"
    # (logs instead of sending — see app/email/providers/fake.py) is both
    # the dev default and the production-safe default until a real
    # provider is configured. Set EMAIL_PROVIDER=resend + RESEND_API_KEY
    # for real delivery (password reset / email verification actually
    # reaching a real inbox needs this — see docs/DEPLOYMENT.md).
    email_provider: str = "fake"
    resend_api_key: str | None = None
    email_from_address: str = "SIDEQUEST <onboarding@resend.dev>"
    # The web app's own origin — used to build links inside verification/
    # reset emails (e.g. {web_base_url}/en/reset-password?token=...).
    # Deliberately separate from cors_origins: that's "who's allowed to
    # call the API," this is "where do I point a human reading an email."
    web_base_url: str = "http://localhost:3000"

    # Error tracking — see docs/DEPLOYMENT.md. Unset (the default) means
    # Sentry's SDK is never even initialized — a true no-op, not "logs
    # somewhere nobody's watching." Set SENTRY_DSN once you have a real
    # Sentry project to actually start receiving errors.
    sentry_dsn: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
