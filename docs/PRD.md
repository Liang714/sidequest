# Product Requirements Document — SIDEQUEST

## 1. Problem

People frequently have free time but don't know what to do or who to do it
with. Existing apps solve adjacent pieces of this — Instagram surfaces places,
Meetup surfaces recurring interest groups, dating apps surface one-on-one
matches — but nothing turns "I'm free tonight" into a concrete plan with
people, in minutes.

## 2. Solution

SIDEQUEST combines activity discovery, spontaneous plan creation, lightweight
social matching, and gamified real-world completion into one loop:

```
"I'm free tonight."
   → SIDEQUEST understands the situation (time, location, budget, mood)
   → suggests activities and compatible people
   → user creates or joins a SideQuest
   → a temporary group forms
   → the group does the activity
   → check-in / photo evidence
   → XP and achievements
   → discovery of new people, places, activities
```

## 3. Target market

| Phase | Market |
|---|---|
| 1 | Seoul |
| 2 | Busan, Incheon, Daegu, Daejeon, Gwangju |
| 3 | International (Tokyo, Singapore, LA, London as design references) |

Korean, English, Japanese, and Chinese are first-class locales from Phase 2
onward (see [ARCHITECTURE.md](ARCHITECTURE.md) — i18n). No UI copy is
hardcoded in Korean or any other language.

## 4. North Star Metric

**Completed quests involving multiple participants, per active user.** This
rewards the thing that actually matters — people doing something together in
the real world — not app opens, joins, or AI generations in isolation.

**Supporting KPIs:** DAU/WAU/MAU, activation rate, D1/D7/D30 retention, quest
completion rate, average participants per quest, user-to-user connection
rate (friends made post-quest), AI generation → publish conversion, premium
conversion, business ROI (repeat sponsorships).

## 5. MVP definition (Phase 2 exit criteria)

> Two real users can register, set up a profile, create a quest, discover it,
> join it, coordinate in a temporary quest room, complete it, and receive XP —
> with zero AI features required for that loop to work end to end.

No advanced AI, no payments, no business accounts are required to hit this
bar. Everything else in this PRD is sequenced after it — see
[ROADMAP.md](ROADMAP.md).

## 6. Non-goals for v1

- Appearance-based matching (matching is interest/availability/behavior-based — see [USER_STORIES.md](USER_STORIES.md))
- Autonomous AI agents that book/plan without user confirmation
- Computer-vision quest verification
- A fully built-out creator marketplace or booking marketplace
- International payment rails beyond Stripe's default coverage
- Microservices, blockchain, NFTs — explicitly out of scope (see product spec §48)
- Any mechanic that manufactures compulsive engagement (streak-shaming, loot
  boxes, artificial scarcity, FOMO push spam) — see [SECURITY.md](SECURITY.md) §Healthy Engagement

## 7. Product flywheel

**User flywheel:** more users → more quests → more participants → more
completed experiences → more behavioral data → better recommendations/
matching → more successful quests → more users.

**Business flywheel:** users → businesses get customers → businesses create
quests → more activities → better discovery → more users → more business
demand.

## 8. Guiding principles

User value > feature count. Reliability > complexity. Safety > growth hacks.
Good UX > unnecessary AI. Real-world usage > vanity metrics. Scalable
architecture > premature microservices. The goal is not "an app that
generates AI quests" — it's a platform that turns free time into real-world
experiences with other people.

See also: [PERSONAS.md](PERSONAS.md), [USER_STORIES.md](USER_STORIES.md),
[USER_FLOWS.md](USER_FLOWS.md).
