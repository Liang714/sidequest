# services/api

FastAPI modular monolith — the Phase 2 MVP backend plus Phase 3 AI (quest
generation, compatibility scoring, recommendations). See
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
├── deps.py                     # get_db, get_current_user, get_current_admin, get_valkey, rate_limit
├── storage.py                    # StorageProvider abstraction (local disk for now — see below)
├── seed.py                         # reference data: categories, interests, achievements
├── make_admin.py                     # CLI: grant is_admin to a user by email (no signup flow for it)
├── ai/                                 # AIService, provider interface, Ollama/Anthropic adapters, prompt/parsing
├── models/                              # SQLAlchemy models, one module per domain
├── schemas/                              # Pydantic request/response shapes
├── services/                              # xp_service (level curve, XP ledger), quest_service (nearby search),
│                                            compatibility_service (interest/proximity/fill-ratio scoring),
│                                            achievement_service (unlock engine), analytics_service (event log),
│                                            business_service (sponsored-quest analytics)
└── routers/                                # one module per API resource — auth, users, quests,
                                              friends, chat (incl. WebSocket), notifications,
                                              gamification, moderation, ai, business
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
uv run pytest              # 54 tests against a real Postgres (sidequest_test db)
uv run ruff check .
uv run mypy app             # strict mode
```

## Admin access

There's no admin signup flow, on purpose (`app/deps.py::CurrentAdmin` gates
`GET /admin/businesses` and `POST /admin/businesses/{id}/verify` — the
Phase 5 business-verification queue). Grant it to an existing user:

```bash
uv run python -m app.make_admin someone@example.com
```

AI generation tests use a `FakeProvider` via `app.dependency_overrides` —
they don't call Ollama/Anthropic, so the suite stays fast and deterministic.
`tests/test_ai.py`'s `parse_quest_json` tests are what actually exercise the
clamping/validation logic a real model's output goes through.

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
- **AI provider**: `AI_PROVIDER=ollama` (local `qwen3:8b`) by default — free,
  no key. `AnthropicProvider` is fully implemented (tool-use for structured
  output) but untested against a real key; set `AI_PROVIDER=anthropic` +
  `ANTHROPIC_API_KEY` to use it instead, no other code changes. This dev
  machine happened to already have a personal Ollama install running for an
  unrelated project — `scripts/setup-local-infra.sh` detects and reuses
  whatever's already on port 11434 rather than starting a second server;
  see docs/AI.md §Implementation status.
- **Recommendations**: `GET /quests/recommended` ranks by interest-tag
  overlap + proximity + fill-ratio (`app/services/compatibility_service.py`),
  not embedding similarity — pgvector isn't installed (same root cause as
  the PostGIS gap above). The `quest_embeddings`/`user_preference_embeddings`
  columns in docs/DATABASE.md exist for when it is; swapping the ranking
  function is additive.
