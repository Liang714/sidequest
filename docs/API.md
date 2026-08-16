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
| GET | `/users/me/achievements` | Full achievement gallery — locked *and* unlocked (Phase 4), sorted unlocked-first |

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
| GET | `/quests/{id}` | Full detail incl. objectives, participant count, `sponsor` if it's a business-sponsored quest (Phase 5). Logs a `quest_viewed` analytics event — see §Businesses below |
| PATCH | `/quests/{id}` | Creator/admin only |
| DELETE | `/quests/{id}` | Soft delete; creator/admin only |
| GET | `/quests/nearby` | `?lat&lng&radius_km` — bounding-box + haversine today, not PostGIS (see docs/DATABASE.md and docs/DEPLOYMENT.md §Local dev without Docker for why) |
| GET | `/quests/mine` | Created or actively-joined quests, any status — added once `apps/web`'s "My Quests" screen needed it; not in the original endpoint list above |
| POST | `/quests/{id}/join` | 409 if full or visibility-restricted |
| POST | `/quests/{id}/leave` | No-op if not a participant |
| POST | `/quests/{id}/checkin` | Marks `quest_participants.checked_in_at` |
| POST | `/quests/{id}/complete` | Verifies required objectives, awards XP, writes `quest_completions`. Returns `{ quest, xp_awarded, new_level, new_achievements }` (Phase 4) — `new_level`/`new_achievements` are only populated the one time completion actually happens, so the client can show a level-up/unlock moment; a repeat call is a no-op returning `xp_awarded: 0` |
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
| POST | `/ai/generate-quest` | `{ free_text, city, lat?, lng? }` → editable draft quest. Ollama (`qwen3:8b`) by default, Claude if `AI_PROVIDER=anthropic` — see docs/AI.md. Logs an `ai_generations` row. |

## Matching

| Method | Path | Notes |
|---|---|---|
| GET | `/quests/{id}/compatibility?lat?&lng?` | Score (0–100) + breakdown — conventional algorithm, not LLM. See docs/AI.md §Implementation status for what the formula actually weighs today. |
| GET | `/quests/recommended?lat?&lng?&limit?` | "For You" — open quests ranked by the same compatibility score |

## Businesses

| Method | Path | Notes |
|---|---|---|
| POST | `/businesses` | Registration, starts `verification_status=pending` |
| GET | `/businesses/mine` | Businesses the current user owns |
| GET | `/businesses/{id}` | Public view |
| POST | `/businesses/{id}/quests` | Create a sponsored/discount/challenge quest — 403 unless the caller owns the business *and* it's `verified` (see docs/SECURITY.md's Phase 4 audit note for the general anti-manipulation stance; verification itself is the anti-spam gate here) |
| GET | `/businesses/{id}/quests` | Owner/admin only — every quest this business has sponsored |
| GET | `/businesses/{id}/analytics` | Owner/admin only. Views, joins, completions, redemptions — see app/services/business_service.py for exactly what each counts (views = `quest_viewed` analytics events; redemptions = completions on `discount`-type quests only, a documented simplification, not a real in-person redemption flow) |
| GET | `/admin/businesses?status=` | Admin-only. Defaults to the `pending` moderation queue |
| POST | `/admin/businesses/{id}/verify` | Admin-only. `{ action: "verify" \| "reject" }` |

Quests created this way carry a `sponsor` object (business name, sponsorship
type, discount details) in `GET /quests/{id}`'s response — see
`QuestOut.sponsor` in `app/schemas/quests.py`. Discovery list endpoints
(`GET /quests`, `/quests/nearby`, `/quests/mine`) don't include it; the
sponsor badge is a detail-page/quest-room concern only.

There's no admin signup flow — `is_admin` is set via
`uv run python -m app.make_admin <email>` (services/api/README.md).

## Subscriptions & AI credits

| Method | Path | Notes |
|---|---|---|
| GET | `/subscriptions/me` | `{ plan, status, current_period_end }` — `plan: "free"` when there's no active-or-not-yet-lapsed subscription row |
| POST | `/subscriptions/subscribe` | Charges via `PaymentProvider`, activates Pro for 30 days. 400 if already subscribed or the charge is declined |
| POST | `/subscriptions/cancel` | Stops renewal — stays Pro until `current_period_end`, standard non-refunding SaaS semantics |
| GET | `/ai/quota` | `{ is_pro, daily_limit, used_today, credits_remaining }` |
| POST | `/ai/credits/purchase` | Charges for a fixed pack of 10 generations, added to `Profile.ai_credits` |

`POST /ai/generate-quest` (see AI above) now 402s once a free user's daily
limit *and* purchased credits are both exhausted — see
`app/services/ai_quota_service.py`.

## Creator marketplace

| Method | Path | Notes |
|---|---|---|
| POST | `/creators` | Register as a creator (`display_name`) — 409 if already registered |
| GET | `/creators/me` | 404 if not yet registered |
| POST | `/creators/quests` | Publish a paid quest template — 403 unless registered as a creator. Fixed 70% creator / 30% platform split (`PLATFORM_REVENUE_SHARE_PCT`, not creator-configurable in this foundation) |
| GET | `/marketplace/quests` | Browsable preview (title, description, price, creator name, `already_purchased`) — **not** a full `QuestOut`; objectives/participants stay hidden until purchase |
| POST | `/marketplace/{quest_id}/purchase` | Charges via `PaymentProvider`, auto-joins the buyer as a participant. 409 if already purchased or full |

Marketplace quests are paywalled, not just unlisted: `GET /quests/{id}`
402s for anyone who hasn't purchased or created it (`apps/web`'s quest
detail page catches that and renders a "purchase to view" notice instead
of the quest), and `POST /quests/{id}/join` 402s too — the only way in is
`POST /marketplace/{quest_id}/purchase`. They're also excluded from
`GET /quests`, `/quests/nearby`, and `/quests/recommended` outright.

## Payments

Every charge above goes through one `PaymentProvider.charge()` call — see
`app/payments/`. `PAYMENT_PROVIDER=fake` (the dev/test default) always
succeeds and moves no real money; `stripe` and `toss` are implemented
against the real APIs but **unverified** — see
`app/payments/providers/stripe.py` and `toss.py` for exactly what each
can and can't do without a real key. **The Phase 6 exit criteria's "a
real payment completes end to end in both providers" is explicitly not
met** — see docs/ROADMAP.md Phase 6.

## Bookings

| Method | Path | Notes |
|---|---|---|
| GET | `/bookings/availability?activity_key=&on_date=&party_size=` | Delegates to `BookingProvider.check_availability` — `FakeBookingProvider` today (no real vendor named, see docs/ROADMAP.md Phase 7), returns synthetic slots for any `activity_key` string |
| POST | `/bookings` | `{ quest_id?, activity_key, slot_ref, party_size }` — books via `BookingProvider.book`, charges the confirmed price via `PaymentProvider`, records a fixed 15% commission against `commission_amount`. `slot_ref` comes from a prior availability call; price is never taken from the client |
| GET | `/bookings/mine` | The current user's bookings, most recent first |
| POST | `/bookings/{id}/cancel` | 404 if not yours, 409 if already cancelled |

`amount`/`commission_amount` are computed from the provider's own
confirmed price (`BookingResult.price_amount`), not whatever price the
client last saw in an availability response — see
`app/services/booking_service.py`.

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
