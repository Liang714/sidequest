# Deployment — SIDEQUEST

## Environments

| Env | Purpose | Infra |
|---|---|---|
| **Development** | Local machine | `docker compose -f infra/docker-compose.yml up` — Postgres+pgvector, Valkey, MinIO, all free (see §Local dev without Docker if that's not available) |
| **Real hosted deployment** *(built 2026-08-17, see §Deploying for real)* | A real reachable URL, not localhost | **Fly.io** (API + Postgres + a self-hosted Valkey machine, all in one Fly org — see `services/api/fly.toml` + `infra/fly-valkey/fly.toml`) + **Vercel** (web). Fly.io picked over Railway for a stronger permanently-free tier for a small app, matching this project's $0-to-develop posture. |
| **Production (future)** | Real users at scale | Same Fly.io + Vercel setup, scaled up (multi-instance, PITR backups, Cloudflare R2, Supabase Auth) — see Phase 9 in [ROADMAP.md](ROADMAP.md), intentionally not over-specified until there's a real target region/traffic to scale for. |

[CONTRIBUTING.md](CONTRIBUTING.md) documents a `feature/*` → `develop` →
`main` promotion path for when there's a team large enough to need a
staging gate. In practice, solo development so far has gone straight to
`main` every time (no `develop` branch has actually existed in this repo)
— every commit on `main` is meant to be deployable, so that's also
exactly what this section's Fly.io/Vercel setup deploys from. Start using
`develop` for real once there's more than one person merging to this repo.

## Deploying for real (Fly.io + Vercel)

Everything below is prepared and ready; the account-creation/first-login
steps need a real human in the loop (an agent can't complete GitHub OAuth
consent screens or enter a card on file) — that's you. Once each account
exists, the rest is copy-paste.

### 0. What you'll end up with

- **`sidequest-liang714-api`** — a Fly.io app running `services/api`'s Docker image
  (`services/api/Dockerfile`), Fly Postgres, and a self-hosted Valkey
  Fly Machine (`sidequest-liang714-valkey`, `infra/fly-valkey/fly.toml`) — all in
  one Fly.io org, so this needs exactly **one** new account.
- **`apps/web` on Vercel** — needs exactly **one** more new account,
  pointed at the Fly API's public URL.
- Everything AI/payments/vision/booking/email/storage-related deploys
  with the same `fake`/`local` provider default this project has used at
  every prior external-vendor gate (Payments Phase 6, Bookings Phase 7,
  AI/Vision Phase 8) — real, honestly-labeled placeholder behavior, $0,
  no new accounts beyond the two above. Flip any of them to a real
  provider later by setting its `*_PROVIDER` env var + secret — see
  `.env.example` and §6 below for email/error-tracking/storage
  specifically (Resend, Sentry, Cloudflare R2 — all optional, all free
  tier, none block a functioning launch on their own).

### 1. Backend — Fly.io

```sh
# Install flyctl (macOS/Linux; see fly.io/docs/flyctl/install for other OSes)
curl -L https://fly.io/install.sh | sh

# Create an account / log in — opens a browser
fly auth login

cd services/api

# Creates the app on Fly (may ask you to rename it — Fly app names are
# globally unique; if "sidequest-liang714-api" is taken, pick another and use that
# name in every command below and in fly.toml's `app =` line)
fly apps create sidequest-liang714-api

# Fly Postgres — an unmanaged Postgres cluster running as Fly Machines in
# your own org, no separate vendor account. Pick the smallest/dev config
# when prompted (this is a small app).
fly postgres create --name sidequest-liang714-api-db --region nrt
fly postgres attach sidequest-liang714-api-db -a sidequest-liang714-api
```

`attach` prints the `DATABASE_URL` it just set directly in your terminal —
copy that value (`fly secrets list` can't show it to you again afterward;
Fly never exposes secret *values* through that command, only digests, on
purpose). It'll look like:

```
postgres://sidequest_liang714_api:PASSWORD@sidequest-liang714-api-db.flycast:5432/sidequest_liang714_api?sslmode=disable
```

Two things about that value are wrong for this app specifically — fix
both before setting it as the real secret:

1. `postgres://` → `postgresql+asyncpg://` (SQLAlchemy needs the driver
   named in the scheme).
2. `sslmode=disable` → `ssl=disable` (asyncpg's own connect() doesn't
   accept a `sslmode` kwarg at all — that's psycopg-style query-param
   naming; asyncpg's equivalent is spelled `ssl`. Found live on the first
   real deploy: `TypeError: connect() got an unexpected keyword argument
   'sslmode'`, straight out of `alembic upgrade head`'s release_command.)

```sh
fly secrets set -a sidequest-liang714-api \
  DATABASE_URL="postgresql+asyncpg://sidequest_liang714_api:PASSWORD@sidequest-liang714-api-db.flycast:5432/sidequest_liang714_api?ssl=disable"

# Volume for photo storage (LocalDiskStorageProvider — see docs/AI.md /
# app/storage.py; swap for real Cloudflare R2 later, same config-only swap
# every other provider abstraction here promises)
fly volumes create sidequest_api_data --region nrt --size 1 -a sidequest-liang714-api

# Required secrets with no safe default — generate a real random secret,
# don't reuse the dev placeholder:
fly secrets set -a sidequest-liang714-api \
  JWT_SIGNING_SECRET="$(openssl rand -hex 32)" \
  CORS_ORIGINS='["https://YOUR-VERCEL-DOMAIN.vercel.app"]'
# (Come back and update CORS_ORIGINS once you know the real Vercel URL
# from step 2 — a mismatch here means the browser's fetches get CORS-
# blocked, not a 500, so it's an easy thing to forget and notice.)

# First deploy — builds services/api/Dockerfile on Fly's remote builder
# (this machine has no Docker, so this is genuinely the first time the
# image actually gets built) and runs the release_command (alembic
# migrations) before the new version takes traffic.
fly deploy

# One-time reference-data seed (categories/interests/achievements —
# required for quest creation/gamification to work at all, see
# app/seed.py's docstring). Not part of release_command since it isn't
# meant to re-run on every deploy.
fly ssh console -a sidequest-liang714-api -C ".venv/bin/python -m app.seed"

# Sanity check
curl https://sidequest-liang714-api.fly.dev/health   # -> {"status":"ok"}
```

### 2. Valkey — its own tiny Fly Machine

```sh
cd ../../infra/fly-valkey
fly apps create sidequest-liang714-valkey
fly volumes create sidequest_valkey_data --region nrt --size 1 -a sidequest-liang714-valkey
fly deploy --image valkey/valkey:8-alpine
```

No public ports are declared in `infra/fly-valkey/fly.toml` on purpose —
`sidequest-liang714-api` reaches it over Fly's private 6PN network at
`sidequest-liang714-valkey.internal:6379` (already set as `VALKEY_URL` in
`services/api/fly.toml`'s `[env]` block), never exposed to the internet.

### 3. Frontend — Vercel

```sh
npm install -g vercel     # or: pnpm add -g vercel
vercel login              # opens a browser — creates an account if you don't have one

cd apps/web
vercel link                # creates a new Vercel project, links this dir to it
```

In the Vercel dashboard for the new project (Settings → Environment
Variables), or via CLI (`vercel env add <NAME> production`), set:

| Variable | Value |
|---|---|
| `API_URL` | `https://sidequest-liang714-api.fly.dev/api/v1` (server-side only — Server Components/Actions call the API directly) |
| `NEXT_PUBLIC_WS_URL` | `wss://sidequest-liang714-api.fly.dev/api/v1` (client-side — the quest-room WebSocket) |
| `NEXT_PUBLIC_API_ORIGIN` | `https://sidequest-liang714-api.fly.dev` (client-side, no `/api/v1` — renders uploaded quest photos, see `app/main.py`'s `/local-storage` mount) |

Then deploy:

```sh
vercel --prod
```

Vercel auto-detects the pnpm workspace (`pnpm-workspace.yaml` +
`packageManager` in the root `package.json`) once Root Directory is set
to `apps/web` in the project's Settings → General — `vercel link` from
inside `apps/web` sets this automatically. Take the resulting
`https://your-project.vercel.app` URL and update `CORS_ORIGINS` on the
Fly side (step 1) to match it exactly, then `fly deploy` again — CORS
origins must match exactly (scheme + host), no wildcards.

### 4. Verify it's real

```sh
curl https://sidequest-liang714-api.fly.dev/health
curl https://sidequest-liang714-api.fly.dev/api/v1/openapi.json -o /dev/null -w "%{http_code}\n"
open https://your-project.vercel.app
```

Register a real account through the real deployed UI, create a quest,
confirm it shows up. AI features will show the honest "running in demo
mode" placeholder text (see `app/ai/providers/fake.py`) until you add a
real `ANTHROPIC_API_KEY` and flip `AI_PROVIDER=anthropic` via `fly secrets
set` — that's expected, not a bug.

### 5. Turning on continuous deploy (optional, once you're ready)

`.github/workflows/deploy.yml` exists and is fully written, but is
`workflow_dispatch`-only (manual trigger from the Actions tab) until
these repo secrets exist (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `FLY_API_TOKEN` | `fly tokens create deploy -a sidequest-liang714-api` |
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | `apps/web/.vercel/project.json` after `vercel link` |

Once those exist, change `.github/workflows/deploy.yml`'s trigger from
`workflow_dispatch` to `push: branches: [main]` for real continuous
deploy on every merge.

### 6. Turning on real email, error tracking, and object storage (optional)

None of these block a real launch on their own (see docs/SECURITY.md
§Security review for what "fake"/no-op actually means for each until
you do this) — but two of them (email verification, password reset)
are genuinely non-functional for real users until email is real, since
right now the token just gets logged, not delivered.

**Email (Resend) — makes verification/password-reset emails actually
arrive:**

```sh
# 1. Create a free Resend account: https://resend.com (3,000 emails/mo,
#    100/day free tier — no credit card required for the free tier)
# 2. Dashboard → API Keys → create one
fly secrets set -a sidequest-liang714-api \
  EMAIL_PROVIDER=resend \
  RESEND_API_KEY="re_your_real_key"
```

Sending `from` Resend's own `onboarding@resend.dev` sandbox address only
delivers to *your own* Resend account email (their anti-abuse
restriction) — real delivery to arbitrary user addresses needs a real
domain verified in Resend (Dashboard → Domains → Add Domain, then a few
DNS records). Once verified:

```sh
fly secrets set -a sidequest-liang714-api \
  EMAIL_FROM_ADDRESS="SIDEQUEST <noreply@yourdomain.com>"
```

**Error tracking (Sentry) — see real errors instead of finding out from a
user:**

```sh
# 1. Create a free Sentry account: https://sentry.io (generous free tier)
# 2. Create a project for each app (Python/FastAPI for the backend,
#    Next.js for the frontend) — Sentry gives you a DSN per project
fly secrets set -a sidequest-liang714-api SENTRY_DSN="https://...@....ingest.sentry.io/..."
```

For the web app, set `SENTRY_DSN` (the Next.js project's own DSN, not
the backend's) as a Vercel environment variable (Settings → Environment
Variables → add `SENTRY_DSN` for Production), then redeploy
(`vercel --prod`). Client-side browser error capture isn't wired up in
this pass (see `apps/web/instrumentation.ts`'s docstring) — server-side
(Server Actions, SSR, route handlers) is covered, which is where most
real errors in this app actually originate.

**Object storage (Cloudflare R2) — durable photo storage instead of a
single Fly volume:**

```sh
# 1. Create a free Cloudflare account, enable R2 (10GB free, zero egress
#    fees): https://dash.cloudflare.com → R2
# 2. Create a bucket, then R2 → Manage API Tokens → create an ACCOUNT API
#    token (not a user token — this authenticates a long-running backend
#    service, not an interactive session; see
#    https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)
#    with Object Read & Write — note the Account ID, Access Key ID, and
#    Secret Access Key it gives you
# 3. R2 → your bucket → Settings → "Public Development URL" → Enable
#    (Cloudflare renamed this from "Public access" in a May 2025 dashboard
#    update — same feature) — this becomes STORAGE_PUBLIC_BASE_URL
fly secrets set -a sidequest-liang714-api \
  STORAGE_PROVIDER=s3 \
  STORAGE_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com" \
  STORAGE_BUCKET="sidequest" \
  STORAGE_ACCESS_KEY_ID="your_access_key_id" \
  STORAGE_SECRET_ACCESS_KEY="your_secret_access_key" \
  STORAGE_PUBLIC_BASE_URL="https://pub-xxxxx.r2.dev"
```

**Gotcha confirmed live (2026-08-18):** having "Object Read & Write"
selected as the token's *permission level* is not sufficient on its own —
the token also has a separate "Specify bucket(s)" scope list. If that
list doesn't explicitly include your bucket (or "Apply to all buckets"
isn't selected), every request fails with `AccessDenied` even though the
permission level looks correct and the key itself authenticates fine
(rules out `InvalidAccessKeyId`/`SignatureDoesNotMatch` — this one's
specifically a scope gap, not a bad credential). Fix: open the token,
confirm your bucket is checked in its bucket-scope list.

Existing photos already on the local Fly volume don't migrate
automatically — this only affects new uploads going forward.

## CI/CD

`.github/workflows/ci.yml` is real and runs today (no secrets needed) —
on every push to `main` and every PR:

- **backend job:** spins up a real Postgres 18 service container, creates
  the `sidequest_test` database, runs `ruff check .`, `mypy app`, and the
  full `pytest` suite against it — the same real-Postgres-not-SQLite
  stance as local dev (see conftest.py).
- **frontend job:** `pnpm typecheck` / `pnpm lint` / `pnpm build` at the
  repo root via Turborepo — scoped automatically to whichever workspace
  packages define each script.

`.github/workflows/deploy.yml` is the CD half — see §Deploying for real
step 5 above for what's blocking it from running automatically today.

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

## Local dev without Docker

The primary Phase 2 dev machine had neither Docker nor Homebrew installed —
installing Homebrew needs an interactive sudo password, which isn't
available in an unattended/agent-driven environment. Rather than block on
that, local infra runs as a self-contained toolchain under `.tools/`
(gitignored, no sudo): a portable Postgres 18 build, Valkey built from
source (no prebuilt macOS binaries are published), Node/pnpm, and
Python/uv. `./scripts/setup-local-infra.sh` automates it end to end and is
idempotent. `infra/docker-compose.yml` remains the documented target for
any machine that does have Docker — nothing about the app depends on which
path was used to start Postgres/Valkey, since both expose the same
protocols on the same local ports.

Two real gaps from this path, both already accounted for in the
architecture rather than silently ignored:

- **No PostGIS / pgvector** (not in the portable Postgres build, no
  Homebrew to add them). `locations` uses plain lat/lng columns; "nearby"
  search is a bounding-box + haversine calculation
  (`services/api/app/services/quest_service.py`) instead of `ST_DWithin`.
  Swapping in the real `geog` column later is additive, not a rewrite.
- **No MinIO** (`dl.min.io` was unreachable from this network). Quest photo
  storage uses a `LocalDiskStorageProvider` behind the same
  `StorageProvider` interface a real S3/R2 adapter would implement
  (`services/api/app/storage.py`).

**Fixed while preparing the Fly.io deploy, worth recording since it was a
genuinely non-obvious bug:** `LocalDiskStorageProvider.public_url()`
generated a `/local-storage/{key}` URL, and nothing served it — no
endpoint returned this URL to a client either, so it was fully latent
until Phase 8's photo-objective UI actually needed to render one. Fixing
both surfaced a second, subtler bug: `app.mount("/local-storage", ...)`
in `app/main.py` (a raw Starlette `Mount`) does **not** get FastAPI's
`root_path="/api/v1"` prefix-stripping applied to it the same way
`include_router()`-registered routes do — confirmed empirically, not
assumed: on the real running server, bare `/local-storage/{key}` 404s
while `/api/v1/local-storage/{key}` 200s, and (surprisingly) the
opposite was true through the pytest ASGI test client, because httpx's
`AsyncClient` concatenates rather than replaces a leading-slash path
against a `base_url` that itself has a path component. `public_url()`
now returns the `/api/v1/local-storage/{key}` form; `tests/
test_vision.py`'s regression check fetches it as an **absolute** URL
specifically to avoid httpx's path-merging quirk masking the bug again —
see that test's comment for the full explanation. Verified live with a
real Playwright browser round-trip (upload → real `<img>` → confirmed
`naturalWidth > 0`, i.e. the browser actually decoded real image bytes,
not a broken-image icon).

See [services/api/README.md](../services/api/README.md) for the exact
commands.

See also [ARCHITECTURE.md](ARCHITECTURE.md) for the technology choices this
plan assumes, and [CONTRIBUTING.md](CONTRIBUTING.md) for the branch/PR
workflow feeding this pipeline.
