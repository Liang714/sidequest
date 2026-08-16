# API — SIDEQUEST

REST + one WebSocket surface, versioned at `/api/v1`. Auto-documented via
FastAPI's generated OpenAPI schema at `/api/v1/openapi.json` (interactive
docs at `/api/v1/docs`) — this file is the human-curated overview; the
generated schema is the contract `packages/types` is built from.

## Conventions

- **Auth:** `Authorization: Bearer <jwt>` — a Supabase-issued JWT, verified
  by FastAPI middleware on every non-public route.
- **Pagination:** cursor-based on all list endpoints —
  `?cursor=<opaque>&limit=20`, response includes `next_cursor` (null when
  exhausted). No offset pagination (doesn't hold up under concurrent writes
  to a live discovery feed).
- **Errors:** `{ "error": { "code": "quest_full", "message": "..." } }`,
  HTTP status matches the error class (400 validation, 401/403 auth,
  404 not found, 409 conflict, 429 rate-limited).
- **Rate limiting:** per-user token bucket in Valkey, default 60 req/min
  (`RATE_LIMIT_DEFAULT_PER_MINUTE`), tighter on write-heavy endpoints
  (quest creation, messages, reports) — see [SECURITY.md](SECURITY.md).
- **Idempotency:** mutating endpoints that can be double-submitted from a
  flaky mobile connection (`join`, `checkin`, `complete`) accept an
  `Idempotency-Key` header.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Delegates to Supabase Auth; creates the `users` row on first successful auth |
| POST | `/auth/login` | Delegates to Supabase Auth |
| POST | `/auth/refresh` | Refresh token → new access token |

## Users & profiles

| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | Full profile incl. private settings |
| PATCH | `/users/me` | Partial update |
| GET | `/users/{id}` | Public view, respects `visibility_settings` |
| GET | `/users/me/xp` | XP total + level + recent `xp_transactions` |
| GET | `/users/me/achievements` | Unlocked achievements |

## Friends

| Method | Path | Notes |
|---|---|---|
| POST | `/friends/request` | `{ addressee_id }` |
| POST | `/friends/accept` | `{ friend_request_id }` |
| POST | `/friends/{id}/remove` | Removes an accepted friendship |
| GET | `/friends` | Paginated friend list |
| POST | `/blocks` | `{ blocked_id }` — also implicitly removes any friendship |

## Quests

| Method | Path | Notes |
|---|---|---|
| GET | `/quests` | Filterable: `category, distance_km, budget_max, group_size, difficulty, indoor_outdoor` |
| POST | `/quests` | Create; `status` starts `draft` or `open` |
| GET | `/quests/{id}` | Full detail incl. objectives, participant count |
| PATCH | `/quests/{id}` | Creator/admin only |
| DELETE | `/quests/{id}` | Soft delete; creator/admin only |
| GET | `/quests/nearby` | `?lat&lng&radius_km` — bounding-box + haversine today, not PostGIS (see docs/DATABASE.md and docs/DEPLOYMENT.md §Local dev without Docker for why) |
| GET | `/quests/mine` | Created or actively-joined quests, any status — added once `apps/web`'s "My Quests" screen needed it; not in the original endpoint list above |
| POST | `/quests/{id}/join` | 409 if full or visibility-restricted |
| POST | `/quests/{id}/leave` | No-op if not a participant |
| POST | `/quests/{id}/checkin` | Marks `quest_participants.checked_in_at` |
| POST | `/quests/{id}/complete` | Verifies required objectives, awards XP, writes `quest_completions` |
| POST | `/quests/{id}/objectives/{objective_id}/complete` | Per-user objective completion — no "uncomplete" |
| GET | `/quests/{id}/compatibility` | Current user's compatibility score + breakdown (Phase 3) |

## Quest rooms (WebSocket)

`WS /api/v1/ws/quests/{id}` — authenticated with the same JWT (passed as a
query param or subprotocol, per client platform constraints).

Message frames (JSON):

```jsonc
// client → server
{ "type": "message.send", "content": "on my way!" }
{ "type": "objective.complete", "objective_id": "..." }

// server → client
{ "type": "message.new", "message": { "id": "...", "sender_id": "...", "content": "...", "created_at": "..." } }
{ "type": "presence.update", "user_id": "...", "status": "checked_in" }
{ "type": "objective.updated", "objective_id": "...", "completed_by": ["..."] }
```

## AI

| Method | Path | Notes |
|---|---|---|
| POST | `/ai/generate-quest` | `{ free_text, location, budget?, duration? }` → draft quest (Claude) — Phase 3 |
| POST | `/ai/recommend-quests` | pgvector + Voyage embeddings similarity — Phase 3 |

## Matching

| Method | Path | Notes |
|---|---|---|
| GET | `/matches` | Ranked candidate users/quests by compatibility (Phase 3) |

## Businesses *(Phase 5)*

| Method | Path | Notes |
|---|---|---|
| POST | `/businesses` | Registration, starts `verification_status=pending` |
| POST | `/businesses/{id}/quests` | Create sponsored/discount/challenge quest |
| GET | `/businesses/{id}/analytics` | Views, joins, completions, redemptions |

## Marketplace *(Phase 6)*

| Method | Path | Notes |
|---|---|---|
| POST | `/creators/quests` | Publish a paid quest template |
| POST | `/marketplace/{quest_id}/purchase` | Stripe/Toss payment → unlocks quest |

## Bookings *(Phase 7)*

| Method | Path | Notes |
|---|---|---|
| GET | `/bookings/availability` | Delegates to a `BookingProvider` adapter |
| POST | `/bookings` | Creates booking + commission record |

## Trust & safety

| Method | Path | Notes |
|---|---|---|
| POST | `/reports` | `{ target_type, target_id, reason }` |
| GET | `/admin/reports` | Admin-only, moderation queue |
| POST | `/admin/reports/{id}/resolve` | `{ action: "actioned" \| "dismissed" }` |

## Notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Paginated |
| PATCH | `/notifications/{id}/read` | |
| GET/PATCH | `/notifications/preferences` | Per-category opt in/out |

## Related docs

[ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) ·
[AI.md](AI.md) · [SECURITY.md](SECURITY.md)
