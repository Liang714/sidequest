#!/usr/bin/env bash
# Stops the local Postgres/Valkey processes started by setup-local-infra.sh.
# Data is preserved (.tools/pgdata, .tools/valkeydata) — re-run
# setup-local-infra.sh to bring them back up.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS="$ROOT/.tools"

if [ -x "$TOOLS/postgres/bin/pg_ctl" ] && [ -d "$TOOLS/pgdata" ]; then
  "$TOOLS/postgres/bin/pg_ctl" -D "$TOOLS/pgdata" stop -m fast || true
fi

if [ -x "$TOOLS/valkey/bin/valkey-cli" ]; then
  "$TOOLS/valkey/bin/valkey-cli" -p 6379 shutdown nosave 2>/dev/null || true
fi

echo "Stopped."
