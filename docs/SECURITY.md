# Security & Trust — SIDEQUEST

SIDEQUEST facilitates real-world meetups between strangers. Safety is a
first-class engineering requirement, not a follow-up feature — several items
below ship in the MVP (Phase 2), not deferred to "later."

## Location privacy

- Discovery uses **approximate location** (geohash/city-radius bucketing),
  never a user's exact live coordinates exposed to other users.
- A quest's **exact meeting point** is only ever a public place chosen by the
  creator at quest-creation time — never a live-tracked position of another
  participant.
- Check-in (`POST /quests/{id}/checkin`) confirms arrival; it does not start
  or expose continuous location tracking. GPS/geofencing is one input among
  several for completion (also QR, photo, business confirmation, manual) —
  never the sole signal, because GPS is spoofable and continuous tracking is
  a privacy liability the product doesn't need. See product spec §13.

## Identity & profile privacy

- Real name is optional and never shown by default — a user opts in per
  audience (public / friends) via `profiles.visibility_settings`. See
  [DATABASE.md](DATABASE.md).
- Profile visibility (public/friends-only) is enforced server-side on every
  `GET /users/{id}` response, not just hidden client-side.

## Report, block, moderation (MVP — Phase 2)

- Report and block are reachable from every profile, quest, and message —
  never buried in a secondary menu.
- Blocking is immediate and bidirectional in effect: no discovery, messaging,
  or quest visibility between the two users, independent of the `friends`
  relationship.
- Reports (`reports` table) carry full target context to the moderation
  queue — an admin should never need to reconstruct what was reported from a
  bare ID.
- Soft deletion (`deleted_at`) on user-facing content means a user "deleting"
  something doesn't destroy the record a moderation investigation may need.

## Abuse & spam prevention

- Per-user rate limiting (Valkey token bucket) on all mutating endpoints,
  tighter on quest creation, messages, and reports specifically — see
  [API.md](API.md) §Conventions.
- New-account and high-report-rate users get automatically reduced discovery
  visibility pending review (suspicious-behavior heuristic, not a permanent
  ban) — a defensive default, not a punitive one.
- File uploads (quest photos, avatars) are validated by content-type and
  size server-side before a signed upload URL is issued, and pass through
  `moderation_status` before appearing publicly.

## Business verification

Businesses start `verification_status = pending` and cannot create sponsored
quests until an admin (or an automated document-check pipeline, later)
verifies them — sponsorship is a trust surface, not just an ad unit.

## Age-appropriate safeguards

Age is collected at signup (`profiles.birth_date`) to gate quest categories
and matching where appropriate; the platform is not designed for
unsupervised minors coordinating unsupervised real-world meetups with adult
strangers — specific age-gating rules are finalized before Phase 2 ships
publicly, not left implicit.

## Encouraging safe meetups

- Product defaults nudge toward **public meeting places** for quests,
  especially first-time meetups between users without a prior connection —
  this is a design default (quest creation guidance, meeting-point
  requirement) rather than a passive hope.
- Quest rooms are temporary and scoped to the quest — there's no persistent
  DM feature with a stranger outside a shared quest context in the MVP,
  narrowing the surface for unwanted contact.

## Healthy engagement (anti-manipulation)

Per the product spec's explicit constraint (§15, §48): no streak-shaming, no
loot boxes, no artificial scarcity, no FOMO-optimized push notification
cadence. Gamification (XP, achievements) rewards actions already worth
doing — it doesn't manufacture urgency to keep someone in the app longer
than the real-world activity itself warrants.

**Phase 4 audit (2026-08-16):** the gamification polish pass (XP/level-up
surfacing, the achievement engine, the profile achievement gallery and
quest history — see docs/ROADMAP.md Phase 4) was checked against this
constraint before shipping:

- Achievement criteria (`app/services/achievement_service.py`) are all
  based on *quests actually completed* — real-world activity that already
  happened — never on login frequency, consecutive-day streaks, or time
  spent in-app. There is no streak field anywhere in the schema.
- Locked achievements are shown in the profile gallery (grayed out, icon +
  name only) so progress is visible, but their unlock criteria are never
  surfaced as a countdown, a "X away!" nudge, or any other urgency framing
  — just present/absent.
- The level-up and new-achievement moment is shown once, synchronously, in
  the completion card the user is already looking at (no push
  notification, no re-engagement prompt to come back and check).
- `analytics_events` (see docs/DATABASE.md) exists to measure achievement
  unlock rate and profile-stats engagement per the Phase 4 exit criteria —
  it's an internal event log, not a growth/manipulation tool; nothing
  reads it to trigger notifications or engagement loops today.

**Phase 6 audit (2026-08-17):** the Pro subscription's perks were checked
against the same constraint, and separately against the Phase 6 exit
criteria's own "additive, not pay-to-win" requirement, before shipping:

- Pro's three perks (unlimited AI generations, a profile badge, more
  objectives per quest — see docs/ROADMAP.md Phase 6) touch nothing that
  affects another user: no matching/compatibility boost, no discovery
  visibility boost, no XP multiplier, no priority in a shared resource
  (quest capacity, chat, etc). A free user and a Pro user compete for
  exactly the same things at exactly the same odds.
- The free AI-generation quota (`app/services/ai_quota_service.py`) resets
  daily on a fixed schedule, not a use-it-or-lose-it streak — missing a
  day costs nothing, and there's no "come back or lose your progress"
  framing anywhere in the quota UI.
- The AI-credit-pack purchase is an alternative to subscribing, not a
  Pro-exclusive unlock — anyone can buy past the daily limit without ever
  subscribing, and Pro users never need to.

## Auth & API security

- JWT-based auth, self-issued (`app/security.py`) rather than
  Supabase-issued today — see docs/ARCHITECTURE.md for why that's a
  deliberately swappable seam, not a permanent choice — verified server-side
  on every protected route; short-lived (30 min) access tokens + a 30-day
  refresh flow. Passwords hashed with Argon2id (OWASP's current
  recommendation), never anything reversible.
- `POST /auth/login` runs the same Argon2id verification work whether or
  not the email exists (`_DUMMY_PASSWORD_HASH` in `app/routers/auth.py`) —
  without this, a nonexistent-email request returns measurably faster
  than a real-email-wrong-password one, letting an attacker enumerate
  registered emails by timing alone.
- Standard injection defenses: parameterized queries via SQLAlchemy (no raw
  string SQL), Pydantic validation (length/range-bounded on every field
  that matters — XP reward, budget, participant count, etc. — not just
  type-checked) on every request body.
- CORS restricted to known app origins; WebSocket connections authenticated
  with the same JWT as REST (passed as a query param at connect time — the
  one deliberate exception to "tokens never leave httpOnly cookies," since
  browsers don't support custom WebSocket handshake headers; short token
  TTL bounds the exposure).
- Rate limiting (`app/deps.py::rate_limit`, Valkey-backed fixed window) on
  every unauthenticated auth endpoint (register/login/refresh — the classic
  brute-force/enumeration targets) and every write endpoint with a real
  abuse incentive: quest creation, objective completion/photo-verification,
  friend requests, blocks, reports, and quest-room chat messages. Keyed
  per-user where authenticated, per-IP otherwise (`--proxy-headers` in the
  Fly deploy so that's the real client IP, not fly-proxy's). Not literally
  every mutating endpoint (e.g. `PATCH /notifications/{id}/read` has no
  realistic abuse case) — this list is the actual coverage, not a rounded-up
  claim.
- Security headers on both the API (`app/main.py`) and the web app
  (`apps/web/next.config.ts`): `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS, plus a real CSP on the
  web app specifically (the API returns JSON, not HTML — a CSP matters far
  less there).
- The API refuses to start in production (`APP_ENV=production`) if
  `JWT_SIGNING_SECRET` is still the public, documented dev-only default —
  a real secret is required, not just recommended.

## Security review (2026-08-18)

A dedicated pass, not folded into a feature milestone — asked for
explicitly ("hard test my application, prevent hacking") once the app was
actually live. Found and fixed, in order of severity:

- **IDOR**: `POST /quests/{id}/objectives/{id}/complete` and the photo-verify
  equivalent never checked the caller had actually joined the quest —
  confirmed exploitable live (a never-joined test account successfully
  marked a required objective complete). Combined with `/complete`'s own
  correct participation check, this meant an attacker could pre-stage
  every required objective as "done" *before* ever joining, then join and
  instantly claim full XP with zero real participation. Fixed:
  `app/routers/quests.py::_require_active_participant`, same check
  `/complete` already had, now applied to both.
- **Missing rate limiting**: `app/deps.py::rate_limit` existed but was never
  actually called by anything — confirmed live (20 rapid bad-password
  login attempts, zero 429s, and a burst large enough to exhaust the DB
  connection pool and return real 500s instead). Wired in — see §Auth & API
  security above — and gave the connection pool more headroom
  (`app/db.py`) as defense-in-depth on top of that.
- **Login timing side-channel** (user enumeration) — see above.
- **Spoofable WebSocket event**: the quest-room WebSocket accepted a client
  `{"type": "objective.complete"}` message and broadcast a fake
  "objective completed" event to the whole room for *any* `objective_id`,
  with no check it belonged to the quest or that anything real happened —
  the frontend never actually sent this message type, so it was a pure
  liability with no offsetting feature. Removed.
- **Missing security headers** — see above.
- Dependency audit: `pnpm audit` (frontend) and `pip-audit` against the
  real pinned production dependency set (backend, via `uv export`) —
  zero known vulnerabilities in either as of this review.
- Corrected two claims in this document that didn't match the actual
  implementation: "webhook signatures are verified" (there are no webhook
  endpoints at all — Stripe/Toss integrations are synchronous `charge()`
  calls, not webhook-confirmed) and "Supabase-issued" JWTs (self-issued
  since Phase 2, Supabase was always the target-state, swappable seam, not
  what's actually running).

## Payment security

Payment provider credentials (Toss, Stripe) never touch application code
paths that log request bodies; card data itself never transits SIDEQUEST's
servers — both providers' hosted/tokenized flows are used. No webhook
endpoints exist today (payments are synchronous `charge()` calls, not
webhook-confirmed) — if/when a real async payment flow needs one, it gets
built with signature verification from the start, not retrofitted.

## Real-user launch readiness (2026-08-18)

A separate, same-day follow-up to the security review above — asked for
explicitly ("fixed all and make it perfect") after being told what was
still missing before real strangers should be trusted with the app:

- **Moderation queue is now real**: `GET /admin/reports` /
  `POST /admin/reports/{id}/resolve` (`app/routers/moderation.py`) — before
  this, `POST /reports` wrote to a table nobody could ever read, so every
  report filed simply vanished. Each `ReportOut` resolves full context
  server-side (`target_label`, `reporter_username`) — an admin never has
  to go reconstruct what was reported from a bare UUID, the original
  design intent this had never actually met until now.
- **Self-service account deletion**: `POST /users/me/delete` — soft
  delete (same pattern as everything else "deleted" in this app), but
  `email`/`username` are mangled and freed for reuse rather than
  permanently squatted on an account nobody can log into, and
  `password_hash` is overwritten with an unusable random value.
  Requires re-entering the password.
- **Email verification + password reset are real, end to end** — new
  `EmailProvider` abstraction (`app/email/`, mirrors every other provider
  seam in this app exactly): `fake` (logs instead of sending) is both the
  dev default and the production-safe default; `resend` is a real,
  working integration against Resend's API, not speculative. Tokens are
  single-use, short-lived (24h verify / 1h reset), and stored only as a
  SHA-256 hash — a DB leak alone can't hand out usable tokens.
  `forgot-password` always returns 204 regardless of whether the email is
  registered, so it can't be used to enumerate accounts by response
  content (a smaller, commonly-accepted residual timing gap remains —
  see the endpoint's own docstring for why closing it fully wasn't worth
  the complexity, unlike login's `_DUMMY_PASSWORD_HASH`).
- **Terms of Service + Privacy Policy** exist (`/terms`, `/privacy`),
  written to accurately describe what this app actually collects and
  does — not a generic template — linked from registration. Explicitly
  labeled as a good-faith draft needing real legal review before this
  scales, not final legal text.
- **Error tracking (Sentry) and durable object storage (Cloudflare R2)**
  are both wired up as real, working, DSN/credential-gated integrations
  (true no-ops without one — see `app/main.py`, `apps/web/instrumentation.ts`,
  `app/storage.py::S3StorageProvider`) — activating either needs an
  account only you can create, see docs/DEPLOYMENT.md §6.
- The API now boots with `min_machines_running = 1` in production (was
  `0`) — a real user's first request no longer eats a cold-start delay,
  traded for the small always-on cost of one shared-cpu-1x/256mb machine.

None of this changes the Phase 6/7 real-vendor deferrals (Stripe/Toss
live charges, a real booking provider) — those remain a separate,
larger commitment, not part of "ready for real users to sign up, use
the core loop safely, and be able to leave."

## Testing requirement

Every milestone that touches auth, authorization, file upload, location
handling, or payments includes explicit security test cases (auth bypass
attempts, injection, rate-limit verification, unauthorized cross-user data
access) — not just happy-path tests. See product spec §37.
