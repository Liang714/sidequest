# Roadmap — SIDEQUEST

Milestone-by-milestone, in order. Each phase ships and is tested before the
next begins — see product spec §36–§38. No phase starts until the prior
phase's exit criteria are met and explicitly approved.

## Phase 0 — Product Foundation *(this milestone)*

**Scope:** PRD, personas, user stories, user flows, feature prioritization,
technical architecture, database ERD, API design, UI/UX architecture, design
system, roadmap, repo structure. No application code.
**Exit criteria:** docs reviewed and approved.

## Phase 1 — Design Prototype

**Scope:** clickable prototype covering onboarding, home, quest discovery,
quest detail, create quest, profile, friends, quest room, map — navigable,
no backend, built directly against the tokens in
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
**Exit criteria:** every core screen is navigable end to end with realistic
placeholder data; design direction signed off before real implementation.

## Phase 2 — MVP

**Scope:** authentication, profiles, interests, quest CRUD, quest discovery,
join/leave, friends, temporary quest rooms, basic chat, notifications, quest
completion, XP. No advanced AI.
**Exit criteria:** *two real users can create, discover, join, and complete a
SideQuest together* — the product spec's own MVP bar, verified with a live
end-to-end test, not just unit tests in isolation.

## Phase 3 — AI

**Scope:** AI quest generation, AI recommendations, compatibility scoring,
personalized discovery — see [AI.md](AI.md).
**Exit criteria:** discovery is measurably personalized (recommendation
click-through beats the Phase 2 rule-based baseline), quest generation
conversion (draft → published) is tracked as a KPI.

## Phase 4 — Gamification *(done 2026-08-16)*

**Scope:** XP, levels, achievements, statistics, quest history — polished
presentation, not just the backend ledger from Phase 2.
**Exit criteria:** achievement unlock rate and profile-stats engagement
tracked; explicitly audited against the anti-manipulation constraints in
[SECURITY.md](SECURITY.md) §Healthy engagement before shipping.

Shipped: a generic achievement-unlock engine (all 5 seeded achievements,
not just the Phase 2 firstQuest special-case) evaluated on quest
completion; `POST /quests/{id}/complete` now surfaces the level-up/new-
achievement moment directly in its response instead of the client having
to infer it; the profile page gained a locked+unlocked achievement
gallery and a quest history list; `analytics_events` (see
[DATABASE.md](DATABASE.md)) logs `achievement_unlocked` and
`profile_stats_viewed` as the local stand-in for the documented PostHog
integration, satisfying the "tracked" half of the exit criteria without a
real PostHog account. Audit note against the anti-manipulation
constraints is in [SECURITY.md](SECURITY.md) §Healthy engagement. Verified
with a real Playwright browser run against the live stack: XP, a level-up,
and three newly-unlocked achievements all rendered correctly from a real
`complete` response, and the profile page correctly showed 3/5 unlocked
with the other two visibly locked.

## Phase 5 — Business *(done 2026-08-16)*

**Scope:** business accounts, verification, sponsored quests, discounts,
business analytics.
**Exit criteria:** one real local business runs a sponsored quest end to
end and receives a usable analytics report.

Shipped: business registration (`POST /businesses`, starts `pending`), an
admin verification gate (`app/deps.py::CurrentAdmin` — no signup flow,
granted via `uv run python -m app.make_admin <email>`) that
`POST /businesses/{id}/quests` enforces before sponsorship goes live,
sponsored/discount/challenge quest creation that behaves exactly like a
normal quest (joinable, completable, shows up in discovery) plus carries
a `sponsor` badge on its detail page, and `GET /businesses/{id}/analytics`
(views via the Phase 4 `analytics_events` table, joins/completions from
existing quest tables, redemptions defined as completions on
discount-type quests — a documented simplification, see
app/services/business_service.py). 8 new backend tests (54/54 total),
ruff/mypy/tsc/eslint/next-build all clean. Verified with a real end-to-end
Playwright run through the actual UI, not API calls standing in for it: a
business owner registered "ABC Dance Studio" through the real form, an
admin verified it through a real (admin-gated) queue page, the owner
published a real sponsored discount quest through the real form, a third
user viewed/joined/completed it through the real quest room, and the
owner's dashboard showed the exact resulting analytics (1 join, 1
completion, 1 redemption) — zero console errors across the whole chain.

## Phase 6 — Monetization *(foundation done 2026-08-17 — real-payment half of the exit criteria intentionally not met, see below)*

**Scope:** subscription (Free/Pro), premium features, creator marketplace
foundation, AI credits, payment system (Toss + Stripe).
**Exit criteria:** a real payment completes end to end in both providers;
premium features are additive, not pay-to-win, per [PRD.md](PRD.md).

**What "not met" means and why:** a real Toss/Stripe charge requires a
real account with each provider — even sandbox/test mode needs a real
signup — which isn't something to do unilaterally on the user's behalf.
Asked directly, the user chose to have everything *else* in this phase
built and fully tested now, with the payment side going in behind a
`PaymentProvider` abstraction defaulting to a fake provider that always
succeeds (`PAYMENT_PROVIDER=fake`, same $0-to-develop posture as every
other provider abstraction in this app), and real Stripe/Toss wiring
picked back up once real API keys exist — the same shape as Supabase Auth
today (self-issued JWTs, documented, swappable later).

Shipped: subscriptions (`POST /subscriptions/subscribe`/`cancel`, `GET
/subscriptions/me`) with correct non-refunding "stays Pro until the paid
period ends" semantics; three additive Pro perks (unlimited AI
generations, a Pro badge, more objectives per quest — audited against
docs/SECURITY.md §Healthy engagement, none affect matching/visibility/
XP, so nothing is pay-to-win); a free/Pro AI generation quota (3/day free,
reusing Phase 4's `analytics`-adjacent `ai_generations` table to count
usage) with a one-off AI-credit-pack purchase as an alternative to
subscribing; and a creator marketplace foundation (register as a
creator, publish a paid quest template, browse `GET /marketplace/quests`,
purchase auto-joins the buyer) — genuinely paywalled, not just unlisted:
`GET /quests/{id}` and `POST /quests/{id}/join` both 402 for a
non-purchaser, and marketplace quests are excluded from every discovery
endpoint. `app/payments/` holds the `PaymentProvider` abstraction:
`FakeProvider` (dev/test default), `StripeProvider` (a real, working
backend-only integration using Stripe's own documented test-mode
PaymentMethod trick — genuinely testable with just a `sk_test_...` key,
no frontend Stripe.js needed), and `TossProvider` (the real `confirm`
API call is implemented, but Toss architecturally requires a client-side
checkout widget this repo doesn't have yet, so `charge()` honestly raises
instead of pretending — see `app/payments/providers/toss.py`'s
docstring). 18 new backend tests (72/72 total), ruff/mypy/tsc/eslint/
next-build all clean. Verified live via a real end-to-end Playwright run
through the actual UI: subscribed to Pro and saw "Unlimited (Pro)" on the
create-quest form; a free user exhausted their 3 daily AI generations
(real Ollama calls), hit the real 402 + "buy credits" CTA, bought a pack,
generated again; a creator published a paid quest through the real form,
confirmed absent from `GET /quests`, a buyer purchased it through the
real marketplace page and was auto-joined, and a non-buyer hitting the
quest URL directly saw the real paywall notice (not a crash) — zero
console errors.

## Phase 7 — Booking *(foundation done 2026-08-17 — real-provider half of the exit criteria intentionally not met, see below)*

**Scope:** `BookingProvider` abstraction, activity discovery, booking,
commission tracking, booking confirmation.
**Exit criteria:** one real provider integration live; commission correctly
recorded against `bookings.commission_amount`.

**What "not met" means and why:** unlike Phase 6 (which at least *named*
Toss and Stripe as real targets), Phase 0 never named a real booking
vendor — there's no OpenTable/Viator/Naver-Reservation equivalent picked
anywhere in the product spec, and the one user story that mentions
booking (USER_STORIES.md "see availability and book an activity... tied
to a quest") is tagged **Could**, the lowest priority tier. Asked
directly, given both facts, the user chose the same shape of answer as
Phase 6: build the foundation now, skip picking (and integrating) a real
vendor.

Shipped: `app/bookings/` — a `BookingProvider` abstraction
(`check_availability` + `book`) mirroring `app/ai/` and `app/payments/`
exactly, with `FakeBookingProvider` as both the dev/test default *and*,
today, the only implementation (env-var-selectable anyway, so a real one
later is a config change, same promise the other two abstractions make).
`GET /bookings/availability` returns synthetic slots for a free-form
`activity_key` (bowling/karaoke/restaurant table/escape room in the UI,
though the backend accepts any string — there's no fixed catalog);
`POST /bookings` books a slot, charges the user for it through the same
`PaymentProvider` Phase 6 built, and records a fixed 15% platform
commission against `bookings.commission_amount` — computed from the
*provider's* confirmed price (parsed back out of `slot_ref`), never a
client-supplied amount, closing off a trivial price-tampering vector.
Bookings can be tied to a quest (`quest_id`) or stand alone, and can be
cancelled. 7 new backend tests (79/79 total), ruff/mypy/tsc/eslint/
next-build all clean. Verified live via a real end-to-end Playwright run
through the actual UI: opened a quest, picked "Bowling" in the real
widget, checked real availability, booked a real slot and got a real
confirmation, saw it on `/bookings` with the correct amount and a
"₩2,850 platform fee" line, cancelled it via the real button — the API
independently confirmed the commission was exactly 15% of the amount.
That run also caught and fixed a real bug: the date picker's "tomorrow"
default used `toISOString()`, which converts to UTC first and can
silently show *today's* date instead near midnight depending on the
browser's timezone offset — fixed to build the date from local Y/M/D
components instead.

## Phase 8 — Advanced AI

**Scope:** AI agent (multi-step planning with user confirmation at each
step, not autonomous action), itinerary planning, multimodal quest
verification (`VisionVerifier`), predictive recommendations.
**Exit criteria:** agent actions remain user-confirmed at every step that
spends money or commits the user to a plan; vision verification measured
against false-positive/false-negative rate before it gates real XP awards.

## Phase 9 — Scale

**Scope:** internationalization rollout beyond Korea, multiple regions,
multiple map/payment providers activated, caching, queue systems, CDN,
database optimization, observability, automated scaling.
**Exit criteria:** defined per target region at the time — this phase is
intentionally not over-specified this early (see product spec §48: don't
build for scale before there's a scale problem).

## Sequencing notes

- Trust & safety (report/block/moderation, location privacy) is **not** a
  separate phase — it ships inside Phase 2 as a hard requirement, per
  [SECURITY.md](SECURITY.md).
- i18n architecture (no hardcoded strings, ko/en/ja/zh resource files) is
  built in Phase 2, even though only Korean content exists in the Phase 1
  market — retrofitting i18n later is far more expensive than building it
  in from the start.
