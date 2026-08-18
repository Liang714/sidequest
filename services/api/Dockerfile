# SIDEQUEST API — production image. See docs/DEPLOYMENT.md for the full
# Fly.io deploy sequence this image is built for. Verified for real on
# Fly's remote builder (this dev machine has no Docker of its own — see
# docs/DEPLOYMENT.md §Local dev without Docker) as of the first live
# deploy, 2026-08-17.

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
#
# --proxy-headers --forwarded-allow-ips="*": trust X-Forwarded-For from
# whoever connects directly, which on Fly is *always* fly-proxy — Fly
# Machines have no public IP of their own, every request is routed
# through Fly's edge first (see fly.toml's [http_service]). Without this,
# app/deps.py's IP-based rate limiting (unauthenticated endpoints —
# register/login/refresh) would key off fly-proxy's own address for
# every request, rate-limiting all callers together instead of each
# other. "*" is safe here specifically because nothing but fly-proxy can
# ever be the direct peer.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
