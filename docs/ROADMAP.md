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

## Phase 5 — Business

**Scope:** business accounts, verification, sponsored quests, discounts,
business analytics.
**Exit criteria:** one real local business runs a sponsored quest end to
end and receives a usable analytics report.

## Phase 6 — Monetization

**Scope:** subscription (Free/Pro), premium features, creator marketplace
foundation, AI credits, payment system (Toss + Stripe).
**Exit criteria:** a real payment completes end to end in both providers;
premium features are additive, not pay-to-win, per [PRD.md](PRD.md).

## Phase 7 — Booking

**Scope:** `BookingProvider` abstraction, activity discovery, booking,
commission tracking, booking confirmation.
**Exit criteria:** one real provider integration live; commission correctly
recorded against `bookings.commission_amount`.

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
