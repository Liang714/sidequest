#!/usr/bin/env bash
# Sets up a self-contained local dev toolchain under ./.tools — no Docker,
# no Homebrew, no sudo. Written for machines that have neither (see
# docs/DEPLOYMENT.md §Local dev without Docker for why this exists).
#
# Idempotent: safe to re-run. Installs/starts:
#   - Node 24 LTS + pnpm       (apps/web)
#   - Python 3.13 + uv          (services/api)
#   - Postgres 18                (portable build, github.com/theseus-rs/postgresql-binaries)
#   - Valkey                      (built from source — no prebuilt macOS binaries published)
#   - MinIO                        (skipped if dl.min.io is unreachable — see note below)
#
# Usage: ./scripts/setup-local-infra.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/.tools"
mkdir -p "$TOOLS"

ARCH="$(uname -m)"
if [ "$ARCH" != "arm64" ]; then
  echo "This script targets Apple Silicon (arm64). Adjust the download URLs for $ARCH." >&2
fi

# ---------- Node + pnpm ----------
if [ ! -x "$TOOLS/node/bin/node" ]; then
  echo "==> Installing Node 24 LTS"
  NODE_VER="v24.19.0"
  curl -sL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-darwin-arm64.tar.xz" -o "$TOOLS/node.tar.xz"
  mkdir -p "$TOOLS/node"
  tar -xf "$TOOLS/node.tar.xz" -C "$TOOLS/node" --strip-components=1
  rm "$TOOLS/node.tar.xz"
fi
export PATH="$TOOLS/node/bin:$PATH"
corepack enable --install-directory "$TOOLS/node/bin" >/dev/null 2>&1 || true
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
echo "Node: $(node -v)   pnpm: $(pnpm -v)"

# ---------- uv + Python ----------
if [ ! -x "$TOOLS/uv/bin/uv" ]; then
  echo "==> Installing uv"
  UV_INSTALL_DIR="$TOOLS/uv/bin" UV_NO_MODIFY_PATH=1 sh -c "$(curl -LsSf https://astral.sh/uv/install.sh)"
fi
export PATH="$TOOLS/uv/bin:$PATH"
export XDG_CONFIG_HOME="$TOOLS/uv-config" XDG_DATA_HOME="$TOOLS/uv-data" XDG_CACHE_HOME="$TOOLS/uv-cache"
uv python install 3.13 >/dev/null
echo "uv: $(uv --version)"

# ---------- Postgres 18 (portable, no sudo) ----------
if [ ! -x "$TOOLS/postgres/bin/postgres" ]; then
  echo "==> Installing portable Postgres 18"
  PG_VER="18.6.0"
  mkdir -p "$TOOLS/postgres"
  curl -sL "https://github.com/theseus-rs/postgresql-binaries/releases/download/${PG_VER}/postgresql-${PG_VER}-aarch64-apple-darwin.tar.gz" -o "$TOOLS/pg.tar.gz"
  tar -xzf "$TOOLS/pg.tar.gz" -C "$TOOLS/postgres" --strip-components=1
  rm "$TOOLS/pg.tar.gz"
fi

if [ ! -d "$TOOLS/pgdata" ]; then
  echo "==> Initializing Postgres data directory"
  "$TOOLS/postgres/bin/initdb" -D "$TOOLS/pgdata" -U sidequest --auth=trust --encoding=UTF8 -E UTF8 --locale=C
fi

mkdir -p "$TOOLS/run"
if ! "$TOOLS/postgres/bin/pg_isready" -h "$TOOLS/run" -p 5432 >/dev/null 2>&1; then
  echo "==> Starting Postgres"
  "$TOOLS/postgres/bin/pg_ctl" -D "$TOOLS/pgdata" -l "$TOOLS/pgdata.log" -o "-p 5432 -k $TOOLS/run" start
fi

for DB in sidequest sidequest_test; do
  "$TOOLS/postgres/bin/psql" -h "$TOOLS/run" -p 5432 -U sidequest -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1 || \
    "$TOOLS/postgres/bin/createdb" -h "$TOOLS/run" -p 5432 -U sidequest "$DB"
  "$TOOLS/postgres/bin/psql" -h "$TOOLS/run" -p 5432 -U sidequest -d "$DB" -c \
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;" >/dev/null
done
echo "Postgres: running on 127.0.0.1:5432 (sidequest, sidequest_test)"

# ---------- Valkey (built from source — no prebuilt macOS binaries) ----------
if [ ! -x "$TOOLS/valkey/bin/valkey-server" ]; then
  echo "==> Building Valkey from source (this takes a minute)"
  VALKEY_VER="9.1.1"
  mkdir -p "$TOOLS/src" "$TOOLS/valkey/bin"
  curl -sL "https://github.com/valkey-io/valkey/archive/refs/tags/${VALKEY_VER}.tar.gz" -o "$TOOLS/src/valkey.tar.gz"
  tar -xzf "$TOOLS/src/valkey.tar.gz" -C "$TOOLS/src"
  make -C "$TOOLS/src/valkey-${VALKEY_VER}" -j"$(sysctl -n hw.ncpu)" BUILD_TLS=no
  cp "$TOOLS/src/valkey-${VALKEY_VER}/src/valkey-server" \
     "$TOOLS/src/valkey-${VALKEY_VER}/src/valkey-cli" \
     "$TOOLS/valkey/bin/"
  rm -rf "$TOOLS/src"
fi

if ! "$TOOLS/valkey/bin/valkey-cli" -p 6379 ping >/dev/null 2>&1; then
  echo "==> Starting Valkey"
  mkdir -p "$TOOLS/valkeydata"
  nohup "$TOOLS/valkey/bin/valkey-server" --port 6379 --dir "$TOOLS/valkeydata" \
    --logfile "$TOOLS/valkey.log" --save "" >/dev/null 2>&1 &
  disown
fi
echo "Valkey: running on 127.0.0.1:6379"

# ---------- MinIO (best-effort — dl.min.io has been unreachable from some networks) ----------
if [ ! -x "$TOOLS/minio/bin/minio" ]; then
  echo "==> Attempting MinIO download (non-fatal if this fails)"
  mkdir -p "$TOOLS/minio/bin"
  if curl -sL --max-time 20 -f "https://dl.min.io/server/minio/release/darwin-arm64/minio" -o "$TOOLS/minio/bin/minio"; then
    chmod +x "$TOOLS/minio/bin/minio"
    echo "MinIO installed."
  else
    echo "MinIO unreachable — quest photo storage falls back to LocalDiskStorageProvider (see app/storage.py). Not required for Phase 2 MVP."
    rm -rf "$TOOLS/minio"
  fi
fi

cat <<EOF

Done. Add this to your shell for the rest of the session:

  export PATH="$TOOLS/node/bin:$TOOLS/uv/bin:\$PATH"
  export XDG_CONFIG_HOME="$TOOLS/uv-config" XDG_DATA_HOME="$TOOLS/uv-data" XDG_CACHE_HOME="$TOOLS/uv-cache"

Then:
  cd services/api && uv sync --dev && uv run alembic upgrade head && uv run python -m app.seed
  cd apps/web && pnpm install
EOF
