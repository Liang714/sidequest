# SIDEQUEST API — production image. See docs/DEPLOYMENT.md for the full
# Fly.io deploy sequence this image is built for.
#
# NOTE: this Dockerfile has not been build-tested locally — this dev
# machine has no Docker (see docs/DEPLOYMENT.md §Local dev without
# Docker). It follows uv's documented Docker pattern and mirrors the exact
# commands already verified working in local dev (`uv sync`, `uv run
# uvicorn app.main:app`, `uv run alembic upgrade head`) — but the actual
# image build only gets verified for real on Fly's remote builder at
# first deploy. Same "implemented, unverified against the real thing
# until an account exists" honesty as AnthropicProvider/StripeProvider.

FROM python:3.13-slim AS builder

# Official uv binary — see https://docs.astral.sh/uv/guides/integration/docker/
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Dependencies first (better layer caching — this layer only invalidates
# when pyproject.toml/uv.lock change, not on every app code edit).
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Now the actual app code, and install the project itself into the venv.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN uv sync --frozen --no-dev

FROM python:3.13-slim AS runtime

RUN groupadd --system app && useradd --system --gid app --create-home app

WORKDIR /app
COPY --from=builder --chown=app:app /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER app

EXPOSE 8000

# fly.toml's release_command runs migrations before this ever serves
# traffic — see docs/DEPLOYMENT.md. Never run migrations on container
# boot: concurrent-instance migration races (see docs/DEPLOYMENT.md
# §Database).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
