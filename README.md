# SIDEQUEST

**What's your sidequest?** — a Seoul-first, internationally-architected platform
that turns free time into real-world experiences with other people: discover a
spontaneous activity, form a temporary group, do it, and level up.

> **Status: Phase 0 — Product Foundation.** This repo currently contains
> product/architecture documentation and an empty project skeleton only.
> There is no runnable application yet — that starts in Phase 1 (clickable
> prototype) / Phase 2 (MVP). See [docs/ROADMAP.md](docs/ROADMAP.md).

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
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Environments, CI/CD, hosting |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phase-by-phase build plan |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching, commit conventions, workflow |

## Repository layout

```
sidequest/
├── apps/mobile/       # React Native + Expo (Phase 2)
├── apps/web/            # Next.js + TypeScript (Phase 2)
├── services/api/         # FastAPI modular monolith (Phase 2)
├── packages/              # design-tokens, i18n, types — shared across apps
├── infra/                  # docker-compose for local Postgres/Valkey/MinIO
└── docs/                    # this table, in file form
```

## Local development (once Phase 2 code lands)

```bash
cp .env.example .env        # fill in local values; defaults match docker-compose
docker compose -f infra/docker-compose.yml up -d   # Postgres+pgvector, Valkey, MinIO
# backend: cd services/api && uv sync && uv run uvicorn app.main:app --reload
# web:     cd apps/web && pnpm install && pnpm dev
# mobile:  cd apps/mobile && pnpm install && pnpm expo start
```

Nothing above is wired up yet in Phase 0 — this is the target shape once Phase 2
starts. Tech choices and the reasoning behind each are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Principles

User value > feature count. Reliability > complexity. Safety > growth hacks.
Good UX > unnecessary AI. Real-world usage > vanity metrics. Scalable
architecture > premature microservices.
