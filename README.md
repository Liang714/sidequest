# SIDEQUEST

**What's your sidequest?** — a Seoul-first, internationally-architected platform
that turns free time into real-world experiences with other people: discover a
spontaneous activity, form a temporary group, do it, and level up.

**Status (September 2026):** the web app and the FastAPI backend work end to end through the real UI. The mobile app is not started, and payments and bookings run on fake providers (real Stripe/Toss adapters exist but are unverified).

| | |
|---|---|
| **Built** | Auth, quests, friends, WebSocket quest rooms, gamification and achievements; business accounts with admin verification; Pro subscriptions with an AI quota; a creator marketplace; activity booking with commission tracking |
| **AI** | Quest generation, compatibility scoring, "For You" recommendations and itinerary planning, behind one provider interface: local Ollama by default, Claude via one env var ([docs/AI.md](docs/AI.md)). AI suggests; it never publishes on its own |
| **Checks** | 131 API test functions against real Postgres and Valkey, ruff and mypy, plus web typecheck, lint and build, all in CI on every push; browser runs through the real UI |
| **Not done** | Mobile app; real payment and booking vendors; no users or production deployment |

Phase-by-phase detail is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Start here

| Doc | Covers |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Problem, core loop, North Star metric, MVP definition |
| [docs/PERSONAS.md](docs/PERSONAS.md) | Who this is for |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | Feature backlog, MoSCoW-tagged |
| [docs/USER_FLOWS.md](docs/USER_FLOWS.md) | Core loop and key flows, as diagrams |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, module boundaries, tech stack + rationale |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, ERD, indexing |
| [docs/API.md](docs/API.md) | REST + WebSocket surface |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Visual language, tokens, components |
| [docs/AI.md](docs/AI.md) | AI provider abstraction, quest generation, recommendations |
| [docs/SECURITY.md](docs/SECURITY.md) | Trust & safety, privacy, abuse prevention |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environments, CI/CD, hosting, **local-dev-without-Docker notes** |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phase-by-phase build plan |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching, commit conventions, workflow |

## Repository layout

```
sidequest/
├── apps/mobile/       # React Native + Expo — not started (next up: Phase 2 continuation)
├── apps/web/            # Next.js + TypeScript — wired to the real API, no mock data left
├── services/api/         # FastAPI modular monolith — real backend, see below
├── packages/              # design-tokens, i18n, types (generated from services/api's OpenAPI schema)
├── infra/                  # docker-compose target shape (Postgres+PostGIS+pgvector, Valkey, MinIO)
├── scripts/                 # setup-local-infra.sh / stop-local-infra.sh — see below
└── docs/                     # this table, in file form
```

## Local development

Without Docker or Homebrew, local infra runs as a
**self-contained toolchain under `.tools/`** (gitignored, no sudo) instead
of `infra/docker-compose.yml` — same services (Postgres, Valkey), just
installed as portable binaries. `infra/docker-compose.yml` is still the
documented target shape for anyone who *does* have Docker (staging/prod use
managed equivalents regardless — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

```bash
./scripts/setup-local-infra.sh   # Node+pnpm, Python 3.13+uv, Postgres 18, Valkey, Ollama+qwen3:8b — idempotent
export PATH="$PWD/.tools/node/bin:$PWD/.tools/uv/bin:$PWD/.tools/gh/bin:$PATH"
export XDG_CONFIG_HOME="$PWD/.tools/uv-config" XDG_DATA_HOME="$PWD/.tools/uv-data" XDG_CACHE_HOME="$PWD/.tools/uv-cache"
export GH_CONFIG_DIR="$PWD/.tools/gh-config"   # gh CLI — same no-sudo pattern, ~/.config is root-owned here

cp .env.example .env             # defaults already match the script's setup

# backend
cd services/api
uv sync --dev
uv run alembic upgrade head
uv run python -m app.seed        # categories/interests/achievements
uv run uvicorn app.main:app --reload   # http://localhost:8000/api/v1/docs
uv run pytest                    # 131 test functions in 21 files, incl. the two-user E2E flow

# web (separate terminal) — talks to the API above; apps/web/.env.local
# already points API_URL/NEXT_PUBLIC_WS_URL at localhost:8000
cd apps/web
pnpm install
pnpm dev                          # http://localhost:3000/en
```

`./scripts/stop-local-infra.sh` stops Postgres/Valkey; data persists in
`.tools/pgdata` and `.tools/valkeydata` for next time.

Tech choices and the reasoning behind each are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Principles

User value > feature count. Reliability > complexity. Safety > growth hacks.
Good UX > unnecessary AI. Real-world usage > vanity metrics. Scalable
architecture > premature microservices.
