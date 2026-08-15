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

## Auth & API security

- JWT-based auth (Supabase-issued, verified server-side on every protected
  route); short-lived access tokens + refresh flow.
- Standard injection defenses: parameterized queries via SQLAlchemy (no raw
  string SQL), Pydantic validation on every request body.
- CORS restricted to known app origins; WebSocket connections authenticated
  with the same JWT as REST.

## Payment security

Payment provider credentials (Toss, Stripe) never touch application code
paths that log request bodies; webhook signatures are verified before any
payment status is trusted; card data itself never transits SIDEQUEST's
servers — both providers' hosted/tokenized flows are used.

## Testing requirement

Every milestone that touches auth, authorization, file upload, location
handling, or payments includes explicit security test cases (auth bypass
attempts, injection, rate-limit verification, unauthorized cross-user data
access) — not just happy-path tests. See product spec §37.
