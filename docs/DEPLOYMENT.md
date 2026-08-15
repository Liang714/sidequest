# Deployment — SIDEQUEST

## Environments

| Env | Purpose | Infra |
|---|---|---|
| **Development** | Local machine | `docker compose -f infra/docker-compose.yml up` — Postgres+pgvector, Valkey, MinIO, all free |
| **Staging** | Pre-production verification | Fly.io/Railway (API) + Vercel preview (web) + EAS preview build (mobile), managed Postgres/Valkey at smallest tier |
| **Production** | Real users | Fly.io/Railway (API, multi-instance behind health checks) + Vercel (web) + EAS production build + submission, managed Postgres (with PITR backups) + Valkey, Cloudflare R2, Supabase Auth |

Promotion path: `feature/*` → `develop` (staging deploys automatically on
merge) → `main` (production deploys on merge, tagged release).

## CI/CD

GitHub Actions, one workflow per app plus a shared quality gate:

- **On every PR:** lint + typecheck (`tsc --noEmit`, `ruff`/`mypy`), unit
  tests (`pytest`, `vitest`), build check for `apps/web` and `services/api`.
- **On merge to `develop`:** deploy to staging, run Playwright/Maestro
  smoke tests against it.
- **On merge to `main`:** deploy to production, tag a release
  (`vX.Y.Z`), run the same smoke suite against production as a post-deploy
  gate — a failure here pages, it doesn't just log.

## Secrets

Never committed. Local dev reads `.env` (git-ignored, from
`.env.example`); staging/production secrets live in the hosting provider's
secret manager (Fly.io secrets / Vercel environment variables / EAS secrets),
injected at deploy/build time, not baked into images.

## Database

- Migrations (Alembic) run as a release step before the new API version
  receives traffic — never auto-run on pod boot, to avoid concurrent
  migration races across instances.
- Automated daily backups + point-in-time recovery in staging/production
  from day one of Phase 2 — this is not a "later" item once real user data
  exists.

## Observability

- **Errors:** Sentry, one project per app (`api`, `web`, `mobile`), source
  maps uploaded on build.
- **Product analytics:** PostHog — event schema matches product spec §35
  (`app_opened`, `quest_joined`, `quest_completed`, ...), North Star Metric
  dashboard configured from the first Phase 2 release.
- **Logs:** structured JSON logs from FastAPI, shipped to the hosting
  provider's log aggregation (Fly.io logs / Railway logs) — a dedicated log
  platform is a Phase 9 scale concern, not a Phase 2 one.

## Rollout discipline

- Staging must pass the smoke suite before any production deploy.
- Production deploys are versioned/tagged so a bad release can be rolled
  back to the previous image instead of hot-fixed under pressure.
- Feature flags (PostHog) gate anything higher-risk (new matching logic, AI
  features) behind a percentage rollout rather than a hard cutover.

See also [ARCHITECTURE.md](ARCHITECTURE.md) for the technology choices this
plan assumes, and [CONTRIBUTING.md](CONTRIBUTING.md) for the branch/PR
workflow feeding this pipeline.
