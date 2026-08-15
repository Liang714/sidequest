# services/api

FastAPI modular monolith — the Phase 2 MVP backend. See
[../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for the module map
and technology rationale, [../../docs/DATABASE.md](../../docs/DATABASE.md)
for the schema, and [../../docs/API.md](../../docs/API.md) for the endpoint
reference.

## Layout

```
app/
├── main.py             # FastAPI app factory, router wiring, CORS, /health
├── config.py             # Settings (pydantic-settings, reads .env)
├── db.py                   # async engine/session, Base, UUIDv7 PKs, timestamp mixin
├── security.py               # Argon2id password hashing, JWT issue/verify
├── deps.py                     # get_db, get_current_user, get_valkey, rate_limit
├── storage.py                    # StorageProvider abstraction (local disk for now — see below)
├── seed.py                         # reference data: categories, interests, achievements
├── models/                          # SQLAlchemy models, one module per domain
├── schemas/                          # Pydantic request/response shapes
├── services/                          # xp_service (level curve, XP ledger), quest_service (nearby search)
└── routers/                            # one module per API resource — auth, users, quests,
                                          friends, chat (incl. WebSocket), notifications,
                                          gamification, moderation
```

## Local setup

From the repo root: `./scripts/setup-local-infra.sh` (Postgres 18 + Valkey,
no Docker/Homebrew/sudo needed — see the root README). Then:

```bash
uv sync --dev
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app --reload   # docs at /api/v1/docs
```

## Testing

```bash
uv run pytest              # 20 tests against a real Postgres (sidequest_test db)
uv run ruff check .
uv run mypy app             # strict mode
```

Runs against real Postgres, not SQLite — see the note at the top of
`tests/conftest.py` for why (and for a real gotcha: async SQLAlchemy engines
and pytest-asyncio's per-test event loops don't mix well by default).

`tests/test_quests_e2e.py::test_two_users_create_discover_join_complete_and_earn_xp`
is the automated version of the Phase 2 exit criteria from
[../../docs/PRD.md](../../docs/PRD.md) — two users create, discover, join,
and complete a quest together and earn XP.

## Known gaps vs. the target architecture

- **PostGIS / pgvector**: not installed (this machine's portable Postgres
  build doesn't include them, and there's no Homebrew to add them).
  `locations` uses plain `lat`/`lng` columns; nearby search is a bounding-box
  + haversine calculation in `app/services/quest_service.py` instead of
  `ST_DWithin`. Swapping in a real `geog` column + GIST index later doesn't
  change any call site — see the note in `app/models/quests.py`.
- **Object storage**: `dl.min.io` was unreachable from this network, so
  quest-photo storage defaults to `LocalDiskStorageProvider`
  (`app/storage.py`) instead of MinIO/R2. The `StorageProvider` protocol is
  in place; adding an S3-compatible adapter later is additive.
- **Supabase Auth**: not wired up (would require creating an external
  account). Auth is self-issued JWTs against the same `users` table
  Supabase Auth would populate — see the docstring in `app/security.py`.
