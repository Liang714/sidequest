# SIDEQUEST — UI/UX System Rebuild

**Date:** 2026-08-27
**Status:** design proposal, pending approval
**Scope:** `apps/web` (and the token layer `apps/mobile` will inherit)
**Design language name:** **SIGNAL**

---

## 0. Assumptions stated up front

The product docs are unusually complete, so few assumptions were needed. Those made:

1. **Web is the real client today.** `apps/mobile` exists but is unbuilt; `apps/web` is mobile-first (`max-w-lg`) and is what deploys to Vercel. This system is designed mobile-first and specifies the desktop adaptation, and the token layer is written so NativeWind can consume it later.
2. **Push notifications are not yet wired.** `GET /notifications` exists; no delivery transport does. The design specifies in-app notifications now and marks push as a later dependency.
3. **Quest imagery is sparse.** Most quests are user-created with no photo. The visual system therefore **cannot** depend on photography (which rules out a full-bleed-image direction) — it must look intentional with type and color alone, and treat photos as an enhancement.
4. **Korean is a first-class locale.** All type choices must cover Hangul with the same weight range as Latin, and all layouts must survive ~15–30% string expansion into Korean/Japanese.
5. **Compatibility score is real but not embedding-backed** (conventional scorer, per `docs/AI.md`). The UI must therefore present it as a *transparent breakdown*, never as an opaque magic number.

---

## A. Product UX Strategy

### The core problem, stated precisely

SIDEQUEST is not a discovery problem or a content problem. It is a **coordination-under-time-pressure problem with a stranger-trust tax.**

A user has 2–4 hours of unplanned time. The value of any suggestion decays to zero at its start time. And unlike Instagram or Meetup, acting on a suggestion means *meeting people you don't know*. So every screen has exactly two jobs:

1. **Make the time-and-proximity math instant.** Can I get there? Has it started? Are there spots?
2. **Retire the stranger-trust tax before the commit**, not after.

Every existing competitor drops one of these. Meetup answers trust (public groups, history) but is too slow — it's for recurring, planned events. Dating apps answer spontaneity but are one-on-one and appearance-coded. Instagram answers inspiration with no coordination at all. Open-chat apps (KakaoTalk OpenChat, Discord) answer coordination but with zero trust surface and no discovery.

### Design philosophy

> **Time is the headline. Trust is the subhead. Everything else is small.**

Three consequences that drive the whole system:

- **The countdown is the largest element on every quest surface.** Not the title, not the photo. "STARTS IN 45M" in the accent color, in tabular numerals. This is the datum the decision actually turns on, and no competitor leads with it. It is the single most differentiating design choice here, and it's differentiating *because it's true*, not because it's novel.
- **You see who you'll meet before you commit.** The roster — faces, first names, level, mutual friends — sits above the Join button, not behind it. This is currently impossible in the app (see §Critical findings) and is both the biggest trust gap and the biggest conversion lever.
- **The reward is for going outside, never for opening the app.** XP, levels and achievements attach exclusively to real-world completion. No streaks, no daily-login bonus, no loot boxes — consistent with `docs/SECURITY.md` §Healthy engagement and `PRD.md` §6.

### Priority order for every design decision

`Can the user act in time?` → `Do they trust it enough to act?` → `Is it obvious what to do?` → `Is it consistent?` → `Is it beautiful?`

---

## A1. Critical findings in the current UI (verified against the codebase)

These are why the rebuild is an IA rebuild first and a visual rebuild second. All four were verified by inspection, not assumed.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **The re-engagement loop is not built.** `GET /notifications` + `PATCH /notifications/{id}/read` ship in the API. The web client has zero references to notifications — no route, no bell, no badge. | `grep -r "notification" apps/web/src` → 0 hits | **Critical.** Friend requests, invites and start-time reminders are invisible. `USER_STORIES.md` tags these **Must**. D1/D7 retention has no mechanism. |
| 2 | **You cannot look at another user.** `GET /users/{id}` exists (public view, respects `visibility_settings`). The web client only ever calls `/users/me*`. | `grep -r "/users/"` → only `/users/me` variants | **Critical.** Breaks the **Must** story "join a quest and see who else is in, so I know what I'm walking into." It is simultaneously a safety failure: there is no way to vet a stranger before agreeing to meet them. |
| 3 | **27 routes competing for 5 tab slots.** `plan` (the flagship Phase 8 AI planner), `bookings`, `marketplace`, `subscription`, `creator`, `business` and `admin` have no *tab* entry — they survive only as a flat list of emoji links at the bottom of the profile page. **Corrected from an earlier draft**, which claimed they were reachable only by typing a URL; that was overstated. Two routes genuinely have zero inbound links anywhere: **`/map`**, and **`/friends`** once the pre-rebuild tab bar is replaced. | `grep -rl 'href="/map"'` → none; profile page link list | **High.** Phases 5–8 shipped real, tested features buried where nobody looks. |
| 4 | **Emoji as interface iconography.** `🧭 ⚔️ ➕ 👥 👤` in the tab bar, `⚙️` in the header. | `tab-bar.tsx`, `app-shell.tsx` | **Medium.** Renders differently per OS/browser, cannot be recolored to signal state, cannot be sized reliably, and is the single loudest "unfinished" cue in the product. |
| 5 | **No search.** No text search over quests anywhere. | `grep -r "search"` → unrelated hits only | **Medium.** Acceptable at low quest density; blocking beyond it. |

---

## B. Target Users

Condensed from `docs/PERSONAS.md`, with the **design mandate** each one creates.

| Persona | Core need | Design mandate |
|---|---|---|
| **Erh, 24** — office worker, Seoul. Free weekday evenings, social circle is coworkers. Photography, dance, cafés. | Turn a free evening into something better than staying home, without organizing a group chat. | The primary user. Optimize the **join** path ruthlessly: home feed → detail → joined in ≤3 taps, with time and roster legible without scrolling. |
| **Jamie, 27** — expat, 8 months in Seoul, limited Korean. | Low-pressure group activity in public where language isn't a blocker. | Language must be a **first-class, visible filter and a visible badge on the card** ("EN OK"), not a buried preference. Never rely on Korean-only text or culturally-implicit iconography. |
| **@seoulwalker** — creator, local knowledge, ~2K followers. | Package an experience once, sell repeatedly, see completions. | Needs a real **Creator Studio** entry point (currently orphaned) with completion analytics as the hero metric, not revenue — completion is what proves the product works. |
| **ABC Dance Studio** — small business, Gangnam-adjacent. | Measurable foot traffic from slow weekday afternoons. | Sponsored quests must look **native but honestly labeled**. A "SPONSORED" chip in the warn color, never disguised. Analytics dashboard is desktop-primary. |

**Not a persona, but a hard constraint:** the *first user in a neighborhood*, who opens a spontaneity app and finds nothing nearby. Cold start is a design problem, not a growth problem — see §J.

---

## C. Core User Journey

Ideal path, with the friction and the fix at each step.

| Step | User objective | Interface | Primary CTA | Friction | UX solution |
|---|---|---|---|---|---|
| **1. Landing** | "Is this for me?" | One screen: what it is in 6 words, three live quests happening tonight in Seoul, one button. | `See what's on tonight` | Generic app-landing skepticism. | **Show real inventory before asking for anything.** Three actual quest cards with live countdowns. Proof, not promises. |
| **2. Sign up** | Get in fast | Email + password, or social. | `Continue` | Password friction; email verification blocking. | Verification is **non-blocking** (already true in the API — registration never fails on email send). User reaches the feed immediately; a dismissible banner asks for verification before their *first join*, which is the first action with real-world consequence. |
| **3. Onboarding** | Make the feed good | 3 steps, not 4. Interests → group size + vibe (merged) → location. | `Next` / `Allow location` | Every step is a drop-off. 4 steps × ~15% ≈ meaningful loss. | Merge group-size and vibe onto one screen (both are 1-tap chip choices; Miller's Law tolerates it). Location is **last and skippable** with a plain-language why and a city-picker fallback. Interests screen shows a live "**24 quests match**" counter that updates as chips are tapped — the user sees value accrue while they invest. |
| **4. First action** | Find something for tonight | **Tonight** feed, pre-filtered to their chips. | `Join` on a card | Empty feed kills it. | Cold-start ladder in §J. Never show a bare empty state. |
| **5. Pre-commit trust** | "Who am I meeting?" | Quest detail: countdown → roster → compatibility breakdown → Join. | `Join quest` | Meeting strangers is the real barrier, and it is currently unaddressed. | The **Roster** with faces, first names, level, mutual friends, and tappable public profiles. Plus "Public place · 4 people going" reassurance and an always-reachable report affordance. |
| **6. Aha moment** | "This is actually happening" | Quest room lights up: a real message, a real check-in. | `I'm here` (check-in) | 45 minutes of dead air between joining and starting is where people bail. | **Race the user to the room.** Joining drops them straight into the room with a pre-written, editable opener ("On my way — see you at 9!"). The room shows a live countdown and a check-in progress bar. The aha is *social proof that other humans are coming*, and it must land within seconds of joining, not at completion. |
| **7. Completion** | Close the loop | Objective checklist → complete → reward moment. | `Complete quest` | Groups forget to complete in-app; XP is silently lost. | At the scheduled end time, the room surfaces a persistent **Wrap up** prompt, and any participant can complete for the group. The reward moment is the emotional peak (Peak-End Rule) — full-screen, XP counting up, achievements stamping in. |
| **8. Retention** | Come back | Reward screen ends on **"Add the people you met"** + next-quest suggestion. | `Add friend` | Connections evaporate; the app becomes one-off. | The single highest-leverage retention mechanic is converting a completed quest into friendships — a friend's activity in the feed is a far stronger return trigger than any notification. Ask at the peak, when goodwill is highest, and never again after. |

**The retention thesis:** activity from people you have actually met in real life. Not streaks. Not push spam.

---

## D. Information Architecture

Five tabs. Everything reachable. No orphans. Role-gated sections appear only for users who hold the role (progressive disclosure).

```
TONIGHT  (tab 1 — discovery, time-first)
├── Search + Filters .......................... sheet
├── Notifications ............................. header, badge
│   └── grouped: invites · requests · reminders · room activity
├── Quest Detail
│   ├── Roster ("who's going")
│   ├── Compatibility breakdown ............... sheet
│   ├── Why recommended? (AI) ................. sheet
│   ├── Share
│   └── Report quest
└── User Profile (public)  ← NEW, closes finding #2
    ├── Send friend request
    ├── Shared quest history
    └── Report / Block

MAP  (tab 2 — spatial discovery)
├── Cluster → Quest peek ...................... sheet
├── Filters (shared with Tonight)
└── Quest Detail

CREATE  (tab 3 — center, opens an action sheet)
├── Create a quest ............................ 3 steps
├── Generate with AI .......................... free text → editable draft → publish
└── Plan my night (AI itinerary) .............. goal → 2–4 steps, each confirmed
                                                 ↳ un-orphans /plan

PLANS  (tab 4 — your commitments)
├── LIVE NOW .................................. pinned, active room
│   └── Quest Room
│       ├── Chat
│       ├── Objectives checklist
│       │   └── Photo verify (advisory AI verdict)
│       ├── Check in
│       ├── Meeting point + map
│       ├── Roster
│       ├── Leave quest
│       └── Complete → Reward moment
├── Upcoming
├── Invitations
├── Bookings .................................. un-orphans /bookings
│   └── Book activity → confirm → receipt
└── History
    └── Quest recap (photos, participants, XP)

YOU  (tab 5 — identity, progress, account)
├── Profile — XP, level, achievements, stats
├── Friends
│   ├── Requests
│   └── Blocked
├── Achievements gallery
├── Marketplace ............................... un-orphans /marketplace
│   └── Quest template → purchase
├── Creator Studio ............ [if creator]    un-orphans /creator
│   ├── Publish template
│   └── Analytics
├── For Business .............. [if owner]      un-orphans /business
│   ├── Register / verification status
│   ├── Sponsored quests
│   └── Campaign analytics
├── SIDEQUEST Pro ............................. un-orphans /subscription
│   └── AI quota · buy credits
├── Settings
│   ├── Account & email
│   ├── Privacy & visibility
│   ├── Notifications
│   ├── Language & region
│   ├── Appearance
│   ├── Blocked users
│   ├── Legal — Terms · Privacy
│   └── Delete account
└── Admin .................... [if admin]       un-orphans /admin
    ├── Report queue
    └── Business verification
```

### Why these five

- **Tonight** over "Home": names the job. Reinforces the time-first thesis in the nav itself.
- **Map** earns a tab because proximity is half the decision and the screen already exists, fully orphaned. Spatial browsing is genuinely a different mental mode from list browsing, not a duplicate.
- **Create** stays center (Fitts's Law — largest target, best thumb position) but becomes a **sheet with three entries** instead of a direct link to the manual form. This is what rescues `/plan`, the most impressive thing the app can do, from being unreachable.
- **Plans** is the biggest structural addition. Your active room is currently buried at `/quests/[id]/room` with no path to it. When a quest is live, this tab shows a **volt dot** and the room is one tap away. Coordination is time-critical; it must never be more than one tap deep.
- **Friends moves under You.** Friending is a profile concern; the *time-critical* half of social (requests, invites) belongs in Notifications, where it will actually be seen.

---

## E. Screen Inventory

Complete. Boring screens included deliberately.

### Essential (12)
| Screen | Purpose | Primary action |
|---|---|---|
| Landing / marketing | Convert visitor with real inventory | See tonight |
| Tonight (feed) | Time-first discovery | Join |
| Search & filters | Narrow to actionable set | Apply |
| Map | Spatial discovery | Open quest |
| Quest detail | Decide to commit | Join quest |
| Quest room | Coordinate to arrival | Check in |
| Objective checklist | Resolve the quest | Complete objective |
| Reward moment | Emotional peak, convert to friendship | Add friend |
| Create quest | Add supply | Publish |
| Plans | Manage commitments | Open live room |
| Own profile | Progress + identity | Edit / share |
| Public profile **(new)** | Vet a stranger | Add friend |

### Secondary (14)
Notifications **(new)** · AI generate draft · AI itinerary planner · Compatibility breakdown · Achievements gallery · Quest history · Quest recap · Friends · Friend requests · Marketplace · Marketplace item · Bookings · Book activity · Pro / subscription

### Onboarding (5)
Welcome · Interests (with live match counter) · Group size + vibe · Location permission · Feed handoff ("Here's tonight")

### Auth (7)
Login · Register · Forgot password · Reset password · Verify email · Verification pending banner · Logged-out quest detail (shareable, gated at Join)

### Business / creator / admin (9)
Business register · Verification pending · Create sponsored quest · Campaign analytics · Creator register · Publish template · Creator analytics · Admin report queue · Admin business verification

### Empty states (11)
Nobody writes these and every one of them is a real user's first impression. Each gets copy in §I.
No quests nearby · No search results · No quests matching filters · No plans yet · No history · No friends · No friend requests · No notifications · No bookings · No achievements yet · Empty quest room (first to join)

### Loading states (6)
Feed skeleton (3 cards) · Detail skeleton · Room connecting · Map tiles · AI generating (streaming, cancellable) · Photo uploading (progress + thumbnail)

### Error states (10)
Offline · Server error (5xx) · Quest full (409) · Quest cancelled/deleted · Not authorized (403) · Rate limited (429) · AI quota exhausted (402 → buy credits) · Paywalled marketplace quest (402) · Photo too large (>8MB) · WebSocket dropped (auto-reconnect banner)

### Success states (6)
Joined · Checked in · Objective complete · Quest complete (reward moment) · Friend request sent · Booking confirmed

### Permission states (3)
Location — pre-prompt explainer, denied fallback (city picker), blocked-in-OS recovery instructions
Camera — pre-prompt for photo objectives, denied fallback (upload from library)
Notifications — asked *after* the first join, never on launch

### Settings & account (9)
Settings index · Account & email · Privacy & visibility · Notification preferences · Language & region · Appearance · Blocked users · Legal · Delete account (with password re-entry)

### Safety (5)
Report user · Report quest · Report message · Block confirmation · Post-block confirmation ("You won't see each other")

### Edge cases (8)
Returning after 30+ days ("Seoul's changed — here's tonight") · Quest starts while you're on the detail page · Creator cancels a quest you joined · You're the only participant at start time · Blocked user is in a quest you're viewing · Duplicate join (idempotency) · Deleted account's content · Suspended account

**Total: ~105 screens and states.** The current app has 27 routes. The gap is almost entirely states, not features.

---

## F. Detailed Screen Specifications

Full specs for the six screens that carry the product. Remaining screens follow the same component grammar.

---

### F1. Tonight (feed)

**Primary goal:** get the user to open a quest that starts soon and is close.

**Visual hierarchy:** ① the countdown on the top card → ② quest title → ③ the Signal Row (distance · price · spots) → ④ roster faces → ⑤ section headers → ⑥ filter chips.

**Layout (mobile, top to bottom):**
```
┌─────────────────────────────────────┐
│ SIDEQUEST            [search] [bell•]│  header, 56px, sticky
├─────────────────────────────────────┤
│ TONIGHT IN                          │  label, micro
│ HONGDAE                             │  display 32, volt period accent
│ 12 quests · 4 starting soon         │  body-s, ink-2
│                                     │
│ [Now] [Nearby] [Free] [EN OK] [+]   │  filter chips, h-scroll
│                                     │
│ ── STARTING SOON ──────────────     │  section label + rule
│ ┌─────────────────────────────────┐ │
│ │ IN 45M            PHOTO   ●LIVE │ │  countdown XL volt · category · live
│ │ HONGDAE PHOTO HUNT              │ │  h1, uppercase, 2-line clamp
│ │ 1.2km · ₩15,000 · 2 spots left  │ │  Signal Row, tabular
│ │ (o)(o)(o) Minji, Tae +1         │ │  roster stack + names
│ │ ┌─────────────────────────────┐ │ │
│ │ │           JOIN              │ │ │  full-width, volt fill, 48px
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│ ...more soon cards (max 3)          │
│                                     │
│ ── FOR YOU ─────────────────────    │
│ [card][card][card] →                │  h-scroll, 78% width, compat badge
│                                     │
│ ── LATER TONIGHT ───────────────    │
│ [compact row][compact row]...       │  2-line rows, no roster
└─────────────────────────────────────┘
  [Tonight] [Map] (＋) [Plans•] [You]    tab bar, 56px + safe area
```

**Components:** `Header`, `FilterChipRow`, `SectionLabel`, `QuestCard` (variants `hero` / `compact` / `carousel`), `SignalRow`, `Countdown`, `RosterStack`, `CompatBadge`, `Button`, `TabBar`.

**Content rules:**
- Max **3** hero cards in Starting Soon. Beyond 3, the urgency signal inflates and stops meaning anything.
- "Starting soon" = starts within 120 minutes. Under 60 min, the countdown ticks live and turns `danger`.
- Sections render only when non-empty. No empty section headers, ever.
- Section order is fixed — **serial position effect**: the most actionable content occupies the first and last positions the user sees.

**Interactions:**
| Gesture | Result |
|---|---|
| Tap card body | → Quest detail (shared-element transition on the title) |
| Tap `JOIN` | Optimistic join, inline → `JOINED ✓`, then a toast: *"You're in. Open the room →"* |
| Tap roster face | → Public profile |
| Pull down | Refresh; countdowns recompute |
| Tap filter chip | Applies instantly, no Apply button; result count animates |
| Long-press card | Quick actions: Save · Share · Not interested |

**Feedback:** skeletons on first load (never a spinner — layout stability); optimistic join with rollback + toast on failure; offline shows a persistent banner and serves the last cached feed with a "may be out of date" note.

**UX rationale:** *Jakob's Law* — the feed/tab structure is conventional so no learning is required. *Hick's Law* — one primary action per card, one decision at a time. The unconventional move is confined to the *content hierarchy* (countdown above title), where it buys real speed instead of novelty.

---

### F2. Quest detail

**Primary goal:** convert to a join, honestly. A user who joins something wrong is worse than one who doesn't join.

**Visual hierarchy:** ① countdown + live status → ② title → ③ roster → ④ Signal Row → ⑤ what you'll do (objectives) → ⑥ meeting point → ⑦ compatibility → ⑧ creator → ⑨ report.

**Layout:**
```
┌─────────────────────────────────────┐
│ ←                      [share][⋯]   │
│                                     │
│ ●LIVE IN 45M              PHOTO     │  countdown XL, volt (danger <60m)
│ HONGDAE                             │  display 32, uppercase
│ PHOTO HUNT                          │
│                                     │
│ 1.2km away · ₩15,000 · 2 of 5 left  │  Signal Row
│ Fri 27 Feb · 9:00–11:00 PM          │
│ [EN OK] [OUTDOOR] [EASY]            │  attribute chips
├─────────────────────────────────────┤
│ WHO'S GOING                      3/5│  ← the trust surface
│ (o) Minji  Lv 7   2 quests w/ you   │  tappable rows → public profile
│ (o) Tae    Lv 3   new here          │
│ (o) Sora   Lv 12  ★ friend          │
├─────────────────────────────────────┤
│ WHAT YOU'LL DO                      │
│ ○ Find 5 neon signs                 │  objectives preview, no checkboxes
│ ○ Group photo at the crossing       │
│ ○ One shot you're proud of   📷      │  camera = photo-verified
│ Earns +250 XP                       │  volt, tabular
├─────────────────────────────────────┤
│ MEETING POINT                       │
│ [static map, ~140px]                │
│ Exit 9, Hongik Univ. Station        │
│ Public place · 4 people going       │  safety reassurance
├─────────────────────────────────────┤
│ 94% YOUR MATCH               [why?] │  CompatBadge → breakdown sheet
├─────────────────────────────────────┤
│ Hosted by @seoulwalker              │
│ 12 quests hosted · 4.8 ★            │  host credibility
├─────────────────────────────────────┤
│ Report this quest                   │  always reachable, ink-3
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│           JOIN QUEST                │  sticky footer, volt, 52px
└─────────────────────────────────────┘
```

**Primary CTA:** `JOIN QUEST` — sticky, thumb-zone, always visible.
**States:** `JOIN QUEST` → `JOINED · OPEN ROOM` → `QUEST FULL` (disabled) → `STARTED · OPEN ROOM` → `VERIFY EMAIL TO JOIN` → `SIGN IN TO JOIN` (logged out).

**Secondary:** share (deep link), save, report, leave (post-join, in `⋯`), tap any participant, tap "why?".

**Interactions:** tapping `JOIN` performs an optimistic join, animates the sticky bar into a two-up `JOINED ✓ | OPEN ROOM`, and auto-opens the room after 1.2s unless the user taps elsewhere — this is the "race to the aha" from §C6. `?` on the compat badge opens a breakdown sheet showing the **real** `compute_compatibility()` components.

**Feedback:** 409 quest-full → the button becomes `QUEST FULL` and a toast offers *"Notify me if a spot opens"*. Leaving requires confirmation only if the quest starts within 2 hours ("Sora and 2 others are counting on you").

**UX rationale:** the roster's position above the fold is the whole point. *Social proof* plus *recognition over recall* ("★ friend", "2 quests with you") does more for join conversion than any amount of copy — and it is the honest way to retire the stranger-trust tax. The report link is deliberately always present and deliberately low-contrast: reachable without being suggestive.

---

### F3. Quest room

**Primary goal:** get every participant physically to the meeting point on time.

**Visual hierarchy:** ① countdown / live state → ② check-in progress → ③ chat → ④ objectives → ⑤ meeting point.

**Layout:**
```
┌─────────────────────────────────────┐
│ ← HONGDAE PHOTO HUNT       [⋯]      │
│ IN 45M · Exit 9, Hongik Univ.       │  persistent context bar
├─────────────────────────────────────┤
│ 2 of 4 here    ●●○○         [I'M HERE]│ check-in strip, volt fill
├─────────────────────────────────────┤
│  (o) Minji                          │
│      I'm at exit 9, black jacket    │  chat, grouped by sender
│                          On my way  │
│                                     │
│  ── Tae checked in ──               │  system events, inline, ink-3
├─────────────────────────────────────┤
│ [Message…]                      [→] │
├─────────────────────────────────────┤
│ OBJECTIVES              0/3    [v]  │  collapsed until start time
└─────────────────────────────────────┘
```

**Time-driven states — the room changes shape three times:**

1. **Before start:** check-in strip + chat dominate. Objectives collapsed. Copy is logistical.
2. **During:** objectives auto-expand and become the primary surface; chat collapses to a peek. A persistent `Wrap up` button appears at scheduled end time.
3. **After completion:** room becomes read-only, an archive banner appears, and the footer becomes `Add the people you met`.

**Interactions:** `I'M HERE` → optimistic check-in, avatar fills volt, system message posts, haptic. Objective tap → complete (server-authoritative; **no** client-broadcast completion, matching the security decision in `docs/API.md`). Photo objective → camera/library sheet → upload with progress → completion lands, and the AI verdict renders as a **labeled advisory aside** (`AI thinks: matches · 62% confident`), never as a gate — per the measured 58%/17%/25% accuracy in `docs/AI.md`.

**Feedback:** WebSocket drop → amber banner "Reconnecting…" with queued outbound messages marked pending; recovery is silent. Rate limit (30/min) → inline, not a modal.

**UX rationale:** a room that looks identical before, during and after the quest forces the user to work out what to do. Reshaping it by time means the right action is always the most prominent one. The check-in strip is deliberately the second element: "are the others actually coming?" is the highest-anxiety question in the whole product.

---

### F4. Reward moment

**Primary goal:** make going outside feel worth it — and convert the group into friendships.

This is the Peak-End Rule screen. It is the last thing a user sees in a session, so it disproportionately sets how they remember the entire product. It is the only place in the system where expressive motion is permitted.

```
┌─────────────────────────────────────┐
│                                     │
│           QUEST                     │  display 40, uppercase
│          CLEARED                    │  volt, overprint stamp, rotate -4°
│                                     │
│         + 2 5 0   X P               │  counts up 0→250, tabular, volt
│                                     │
│  LEVEL 7 ▓▓▓▓▓▓▓▓░░ 2,840 / 3,500  │  bar fills, then level-up if crossed
│                                     │
│  ── NEW ─────────────────────       │
│  [◆ Night Owl]  [◆ Shutterbug]     │  achievements stamp in, staggered
│                                     │
│  ── YOU MET ─────────────────       │
│  (o) Minji                 [+ ADD]  │  the retention ask
│  (o) Tae                   [+ ADD]  │
│  (o) Sora            ★ friend       │
│                                     │
│  [ADD ALL 2]                        │  volt, primary
│  Done                               │  text button
└─────────────────────────────────────┘
```

**Motion:** stamp lands at 0ms (scale 1.15 → 1, 220ms) → XP counts up over 700ms → level bar fills 400ms → achievements stagger in at 120ms intervals → roster fades up last. Total ~1.6s, fully skippable by tap, and reduced to simple fades under `prefers-reduced-motion`.

**Rationale:** the reward is **fixed and earned**, not variable. No spinning wheel, no mystery box. `PRD.md` §6 and `SECURITY.md` §Healthy engagement both rule out variable rewards, and the product doesn't need them — the real-world experience *is* the reward. Placing the friend ask at the emotional peak is the single most valuable design decision for retention, and it's asked once, never nagged.

---

### F5. Create (sheet + manual flow)

**Sheet** (from the center tab):
```
┌─────────────────────────────────────┐
│ ─────                               │  drag handle
│ START SOMETHING                     │
│                                     │
│ [＋] Create a quest                 │  full control, 3 steps
│      Pick the place, time, and who  │
│                                     │
│ [✦] Generate with AI       3 left   │  quota shown up front
│      Describe your night, get a draft│
│                                     │
│ [◷] Plan my night          3 left   │  the Phase 8 planner, finally findable
│      2–4 steps, you confirm each    │
└─────────────────────────────────────┘
```

Showing remaining quota **before** the user invests effort prevents the worst possible flow: type a prompt, wait 15s, hit a 402.

**Manual creation — 3 steps, not the current 8-field wall:**

1. **What & where** — title, category chips, location (map pin + neighborhood autocomplete). 
2. **When & who** — date/time (default: *tonight, next round hour*), duration, max participants (stepper, default 4), budget (default free).
3. **Review & publish** — renders as **the actual QuestCard the user will see in the feed**, plus visibility (public / friends-only / private). One `PUBLISH`.

**Rationale:** *progressive disclosure* — three digestible groups beat eight fields. Aggressive defaults mean a valid quest is one tap from step 1 to publish. The step-3 preview is *recognition over recall*: the creator sees exactly what a joiner will see, which measurably improves quest quality and directly serves the AI generation → publish conversion KPI in `PRD.md` §4.

**AI generation flow:** free text → streaming draft with a cancel affordance → the draft opens **in the step-3 review card**, fully editable, clearly labeled `AI DRAFT`. Never auto-publishes (a hard rule from `docs/AI.md`). If the model returns something unusable, the fallback is the manual form pre-filled with whatever parsed — never a dead end.

---

### F6. Notifications (new — closes finding #1)

**Primary goal:** return the user to a time-critical commitment.

Grouped, not a flat firehose:

```
┌─────────────────────────────────────┐
│ ← NOTIFICATIONS      Mark all read  │
├─────────────────────────────────────┤
│ NEEDS YOU                           │  invites + friend requests
│ ● Minji invited you to Photo Hunt   │
│   Starts in 2h        [JOIN] [LATER]│  actionable inline
│ ● Tae wants to be friends           │
│                    [ACCEPT] [IGNORE]│
├─────────────────────────────────────┤
│ STARTING SOON                       │
│ ● Photo Hunt starts in 45m          │
│   Exit 9, Hongik Univ.   [OPEN ROOM]│
├─────────────────────────────────────┤
│ ACTIVITY                            │
│   Sora completed Euljiro Print Crawl│
│   You earned ◆ Night Owl            │
└─────────────────────────────────────┘
```

**Rationale:** three groups in a fixed priority order — *needs a decision* → *time-critical* → *ambient*. Actions resolve **inline**; making a user navigate to accept a friend request is pure friction. The badge counts only the first two groups, so ambient activity can never inflate it — a badge that lies gets ignored, and then the real ones get ignored too.

---

## G. User Flows

```
JOIN (the critical path — 3 taps to committed)
Tonight feed → tap card → Quest detail → tap JOIN
  ↓ optimistic
JOINED ✓ ──1.2s──→ Quest Room (auto-open)
  ↓ failure branches
  409 full ......→ button → QUEST FULL + "Notify me if a spot opens"
  403 unverified → sheet: "Verify your email to join" + [Resend]
  401 ...........→ Sign in, then return to this exact quest and auto-join
  network .......→ rollback, toast "Couldn't join — try again" [Retry]
```

```
COMPLETE
Room (during) → objectives expand → tap objective
  ↓ photo-verified?
  yes → camera/library → upload (progress) → objective completes
        → AI verdict shown as advisory aside (never a gate)
  no  → completes immediately
  ↓ all required done
"Wrap up" appears → tap → confirm sheet ("Everyone here? This awards XP")
  ↓ POST /quests/{id}/complete
Reward moment → Add friends → Done → Plans (History)
  ↓ repeat call → xp_awarded: 0 → skip reward, go straight to recap
```

```
AI ITINERARY (Phase 8, now reachable)
Create sheet → "Plan my night" → free-text goal + location
  ↓ streaming, cancellable
2–4 step cards, each with an explicit CONFIRM
  ↓ per step, independently
join_quest ....→ joinQuestAction ..............→ step marked done
create_quest ..→ opens the review card (F5.3) .→ user publishes
book_activity .→ availability → slot → confirm → payment → receipt
  ↓ 402 quota
"You're out of AI generations today" [Buy 10] [Go Pro] [Create manually]
```

```
REPORT / BLOCK (reachable from every profile, quest, and message)
⋯ → Report or Block
  Report → reason chips (harassment · spam · unsafe · fake · other)
         → optional detail → submit → "Thanks. We'll review this."
         → offer Block as a follow-up
  Block  → confirm ("You won't see each other. Removes any friendship.")
         → immediate: no discovery, no messages, no quest visibility
```

```
COLD START (no quests nearby — the make-or-break flow)
Tonight feed → 0 results within 15km
  ↓ ladder, never a bare empty state
1. widen radius automatically → "Nothing in Hongdae. Here's the rest of Seoul."
2. still empty → 3 AI-seeded starter ideas for this exact time and place
                 → one tap → prefilled review card → publish
3. → "Be the first here" + invite-a-friend link
```

---

## H. Design System — SIGNAL

### Brand personality

**Energetic · confident · urban · trustworthy.** Deliberately *not* cute, *not* gamer-coded, *not* corporate-minimal. The reference point is a well-designed gig poster or a transit sign: loud where it matters, silent everywhere else, and never decorative.

The gamification reads as **evidence** ("you did this") rather than **fantasy** ("you are a level 7 wizard"). This is the line `DESIGN_SYSTEM.md` already draws — "premium software first, game-adjacent second" — held more strictly.

### Color

One voltage accent with exactly one meaning: **go / live / earned**. Never decorative, never a background wash. Explicitly avoids the gradient-purple default of AI-generated interfaces.

**Dark (primary theme)**
| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0B` | App canvas |
| `surface` | `#141416` | Cards, rows |
| `surface-2` | `#1C1C20` | Sheets, popovers, inputs |
| `line` | `#2A2A30` | Hairlines, card borders |
| `ink` | `#FAFAFA` | Primary text |
| `ink-2` | `#A1A1AA` | Secondary text, metadata |
| `ink-3` | `#6B6B75` | Tertiary, disabled, timestamps |
| **`volt`** | `#C9F53F` | **Primary CTA fill, live, XP, earned** |
| `volt-ink` | `#0A0A0B` | Text on volt |
| `info` | `#4B7BFF` | Links, AI surfaces, compatibility |
| `warn` | `#FFB020` | Sponsored, warnings, pending |
| `danger` | `#FF4438` | Destructive, urgent (<60 min) |

**Light**
| Token | Hex |
|---|---|
| `bg` | `#FAFAF7` |
| `surface` | `#FFFFFF` |
| `surface-2` | `#F2F2EE` |
| `line` | `#E3E3DD` |
| `ink` | `#0A0A0B` |
| `ink-2` | `#5C5C63` |
| `ink-3` | `#8E8E96` |
| `volt` (fill) | `#C9F53F` |
| `volt-text` | `#5C7A00` |
| `info` | `#2F55D4` |
| `warn` | `#9A6300` |
| `danger` | `#D92D20` |

**Contrast (verified):**
- `ink` on `bg`, both themes: **> 17:1**
- `ink-2` on `bg`: dark **7.6:1**, light **7.1:1**
- `ink-3` on `bg`: dark **4.7:1**, light **4.6:1** — metadata only, never body copy
- `volt-ink` on `volt`: **17.2:1**
- `volt` as text on dark `bg`: **16.8:1**
- **`volt` as text on light `bg` fails (1.3:1)** — hence the separate `volt-text` token. This is exactly the mistake a single-palette system makes; the two tokens exist to make it impossible.

**Semantic discipline (the rule that keeps it coherent):** `volt` = go/live/earned. `info` = explanation/AI. `warn` = paid/promoted/pending. `danger` = destructive/urgent. A color is never chosen for looks. Categories get **icon + label**, never color alone (colorblind accessibility, and it keeps the palette from sprawling to twelve accents).

### Typography

| Role | Family | Notes |
|---|---|---|
| Display | **Archivo** (variable weight + width) | 800–900, uppercase, tight tracking. Open source, on Google Fonts. |
| UI / body | **Pretendard Variable** | Latin **and** Hangul in one family with a full weight range — non-negotiable for a Seoul-first product. Self-hosted via `next/font/local`. Inter is the Latin-only fallback. |
| Numerals | Archivo, `font-variant-numeric: tabular-nums` | No third family. Countdowns and prices must not shift width as they tick. |

| Style | Size / LH | Weight | Tracking |
|---|---|---|---|
| Hero | 40 / 0.92 | 900 | −0.035em |
| Display | 32 / 0.95 | 900 | −0.03em |
| H1 | 26 / 1.05 | 800 | −0.025em |
| H2 | 20 / 1.15 | 700 | −0.02em |
| H3 | 17 / 1.25 | 700 | −0.01em |
| Body | 16 / 1.5 | 400 | 0 |
| Body S | 14 / 1.45 | 400 | 0 |
| Caption | 12 / 1.35 | 500 | +0.01em |
| Label (micro) | 11 / 1.2 | 700 | +0.08em, uppercase |
| Countdown XL | 34 / 1.0 | 800 | −0.02em, tabular |
| Numeric | 15 / 1.2 | 700 | 0, tabular |

**Minimum body size is 14px.** Nothing below 11px exists in the system, and 11px is reserved for uppercase labels where the caps height carries legibility.

**Korean/Japanese:** uppercase and negative tracking are Latin-only treatments — Hangul must render at normal tracking and normal case. Display styles carry a `:lang(ko), :lang(ja), :lang(zh)` override that resets `text-transform` and `letter-spacing`. Getting this wrong is the most common failure in a "bold uppercase" system applied to a CJK product.

### Spacing

4px base: `2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Backward-compatible with the existing token package (adds 2, 20, 40).

**Rhythm:** 16 = screen gutter. 12 = inside a card. 8 = between related lines. 24 = between sections. 40 = above a section label. These five are the only vertical gaps in the app; the brief's warning about "inconsistent spacing" is answered by having a short list, not a large one.

### Radius

Five values, no exceptions: `card 16` · `button 12` · `input 12` · `sheet 24` (top corners only) · `pill 999`.

### Elevation

Dark mode has no usable shadows on a `#0A0A0B` canvas. Depth comes from **surface lightness + hairline**, which is the craft detail most systems miss.

| Level | Dark | Light |
|---|---|---|
| e0 | on `bg`, no border | on `bg`, no border |
| e1 (card) | `surface` + 1px `line` | `surface` + `0 1px 2px rgba(10,10,11,.05)` |
| e2 (sheet, popover) | `surface-2` + 1px `line` | `surface` + `0 8px 24px rgba(10,10,11,.10)` |
| e3 (modal) | `surface-2` + scrim `rgba(0,0,0,.7)` + blur 8px | same + `0 16px 48px rgba(10,10,11,.16)` |

A single `glow` treatment exists (`0 0 24px rgba(201,245,63,.28)`) and is permitted on **exactly two** things: a live countdown and the reward-moment stamp. Nowhere else.

### Icons

**Lucide** (open source, 1.5px stroke, tree-shaken React package). Sizes 16 / 20 / 24. **Emoji are removed from all interface chrome** — they render inconsistently per platform, can't take on state color, and are the current build's loudest unpolished cue. Emoji remain valid only inside user-authored content (chat messages).

### Components

Each with variants / states / a11y notes.

| Component | Variants | States | Notes |
|---|---|---|---|
| **Button** | primary (volt) · secondary (outline) · ghost · danger | default · hover · pressed (scale .97) · loading (spinner, label held) · disabled · success | Heights 40/48/52. Min touch target 44×44. Loading preserves width — no layout jump. |
| **IconButton** | ghost · filled | + focus-visible ring (2px `info`, 2px offset) | 44×44 hit area even at 20px icon. Requires `aria-label`. |
| **Input** | text · textarea · number · password | default · focus · error · disabled · with-counter | Label always visible (never placeholder-as-label). Error message below, `danger`, with an icon. |
| **SearchBar** | inline · full | empty · typing · results · no-results | Debounce 250ms. Clear button appears on content. |
| **FilterChip** | default · selected · with-count | + disabled | Selected = volt fill, `volt-ink` text, **plus a check icon** — never color alone. |
| **CategoryChip** | icon + label | selected | Lucide icon, never emoji. |
| **Badge** | `LIVE` · `SPONSORED` · `PRO` · `AI DRAFT` · `EN OK` · count | — | Uppercase micro label. Sponsored is always `warn` and always literal. |
| **QuestCard** | hero · compact · carousel · past | default · joined · full · cancelled · sponsored | One radius (16), one shadow level (e1). The Signal Row is identical in all variants. |
| **SignalRow** | 2–4 datums | live (ticking) · urgent (<60m, danger) | Tabular numerals, `·` separators. The app's most repeated component — consistency here is what makes the product feel like one thing. |
| **Countdown** | xl · inline | future · soon (<120m) · urgent (<60m) · live · ended | Ticks per second only under 60m (battery). `aria-live="polite"`, throttled to once a minute for screen readers. |
| **RosterStack** | stacked avatars · list rows | +N overflow past 4 | Avatars are tappable → public profile. Overflow badge opens the full roster. |
| **Avatar** | 24 / 32 / 40 / 64 | image · initials fallback · checked-in (volt ring) | Initials fallback is deterministic by user id — never a random color. |
| **CompatBadge** | ring · inline | 0–100, tappable | Opens the real breakdown. Never presented as an opaque score. |
| **XPBar** | segmented | filling · level-up | Tabular label `2,840 / 3,500`. |
| **Tabs** | underline | active · inactive · badge | Swipe between panels on mobile. |
| **TabBar** | 5 slots, center accent | active · badge · dot | Volt dot on Plans when a quest is live. Safe-area padded. |
| **BottomSheet** | peek · half · full | dragging · settling · dismissed | Drag handle, swipe-to-dismiss, backdrop tap, focus trap, `Esc`. Returns focus to the trigger on close. |
| **Modal** | confirm · destructive | — | Reserved for destructive confirmations only; everything else is a sheet. |
| **Toast** | info · success · error | with action · auto-dismiss 4s | Bottom, above the tab bar. Never covers the primary CTA. Errors persist until dismissed. |
| **Tooltip** | — | — | Desktop only. Never the sole carrier of information. |
| **Progress** | bar · ring · steps | indeterminate · determinate | Determinate wherever a real percentage exists (uploads). |
| **Skeleton** | text · card · avatar | shimmer (disabled under reduced-motion) | Matches final layout dimensions exactly — no reflow on load. |
| **EmptyState** | illustrative · compact | — | **Always** carries an action. An empty state without a next step is a bug. |
| **ErrorState** | inline · full · banner | retryable · terminal | Says what happened, why, and what to do. Never a raw status code. |
| **ConfirmDialog** | default · destructive | — | Destructive names the consequence in the button ("Delete account"), never "OK". |

### Grid & responsive

Mobile-first. Single column, 16px gutters, `max-w-[440px]`. Breakpoints:

| Width | Adaptation |
|---|---|
| < 640 | Single column. Bottom tab bar. Sheets slide from bottom. |
| 640–1023 | Two-column feed. Tab bar persists. Sheets become centered modals. |
| ≥ 1024 | **Left sidebar nav replaces the tab bar.** Two-pane: quest list ‖ detail. Room becomes a three-pane (list ‖ chat ‖ objectives). Map becomes full-height with an overlaid list. Business/creator/admin analytics are **desktop-primary** — data tables and charts genuinely need the width. |

---

## I. UX Copy

Voice: **direct, warm, second person, present tense.** Short. No exclamation marks except at the reward moment. Never "Oops!", never "Something went wrong", never em-dash-heavy AI cadence.

**CTAs:** `Join quest` · `I'm here` · `Complete quest` · `Publish` · `Add friend` · `Buy 10 generations` · `Book this slot` · `Delete my account`
Every destructive button names its consequence. No bare `OK` / `Submit` / `Confirm` anywhere.

**Onboarding**
- Welcome: **"Free tonight?"** / "Find something to do, and people to do it with."
- Interests: "What are you into?" / "Pick 3 or more. You can change these later." → live: **"24 quests match"**
- Group size + vibe: "How do you like to hang out?"
- Location: **"We'll show you what's close."** / "Your exact location is never shared with other users — only rough distance." → `Allow location` / `Pick a neighborhood instead`
- Handoff: "You're set. Here's tonight."

**Empty states**
| Where | Copy | Action |
|---|---|---|
| No quests nearby | "Nothing in Hongdae right now." / "Be the first — it takes about a minute." | `Create a quest` |
| No search results | "No quests match "neon"." / "Try a category, or widen your distance." | `Clear search` |
| No filter matches | "No quests fit these filters." | `Clear filters` |
| No plans | "You haven't joined anything yet." / "Tonight's list is waiting." | `See tonight` |
| No history | "Nothing completed yet." / "Your finished quests will live here." | `See tonight` |
| No friends | "No friends yet." / "The easiest way to make them is finishing a quest together." | `See tonight` |
| No notifications | "You're all caught up." | — |
| No achievements | "No badges yet." / "Finish your first quest to unlock three." | `See tonight` |
| Empty room | "You're first here." / "Say hi — it makes people more likely to show up." | prefilled opener |
| No bookings | "No bookings." / "You can book a lane or a table from any quest." | — |

**Errors**
| Case | Copy |
|---|---|
| Offline | "You're offline. Showing what we last loaded." |
| 5xx | "Our side broke, not yours. Try again in a moment." `Retry` |
| 409 full | "This one just filled up." `Notify me if a spot opens` |
| Cancelled | "The host cancelled this quest." `Find something else` |
| 403 | "You don't have access to this." |
| 429 | "Slow down a second — try again shortly." |
| 402 AI quota | "You're out of AI generations today." `Buy 10` · `Go Pro` · `Create manually` |
| 402 paywalled | "This is a paid quest from @seoulwalker." `Unlock — ₩4,900` |
| Photo too large | "That photo's over 8MB. Try a smaller one." |
| WS dropped | "Reconnecting…" (auto-clears silently) |
| Unverified | "Verify your email to join." `Resend` |

**Success**
`You're in. Open the room →` · `Checked in. 3 of 4 here.` · `Objective done.` · `Quest cleared. +250 XP` · `Request sent.` · `Booked. Fri 9:00 PM.`

**Permissions**
- Location: "We'll show you what's close." / "Your exact location is never shared with other users — only rough distance."
- Camera: "One objective needs a photo." / "Photos are only visible to people in this quest."
- Notifications (asked after the first join, never on launch): "Want a nudge before it starts?" / "We'll only message you about quests you've joined."

**Confirmations**
- Leave (<2h): "Leave this quest?" / "Sora and 2 others are counting on you."
- Block: "Block Tae?" / "You won't see each other's quests or messages. Any friendship is removed."
- Delete account: "Delete your account?" / "Your quests, XP, and history go away. This can't be undone." → password re-entry.

**Notification copy (push-ready)**
- `Photo Hunt starts in 30 minutes — Exit 9, Hongik Univ.`
- `Minji invited you to Hongdae Photo Hunt, 9:00 PM tonight.`
- `Tae wants to be friends.`
- `A spot opened in Euljiro Print Crawl.`

Never: "You haven't opened SIDEQUEST in a while!" or any streak-loss framing. Notifications exist only for things the user opted into.

---

## J. Edge Cases

| Case | Handling |
|---|---|
| **Cold start / no quests** | Three-rung ladder (§G): auto-widen radius → AI-seeded starter ideas for this time and place, one tap to a prefilled draft → "be the first" + invite link. **A bare empty feed never renders.** |
| No friends | Framed as the product's own promise, not a deficiency: friends come from finishing quests. |
| No search results | Suggests a category and a wider radius, keeps the query visible for editing. |
| Poor connection | Cached feed + persistent banner. Writes queue and retry. Chat messages show a pending state. Optimistic UI everywhere, with rollback and an explicit toast on failure. |
| Server error | Inline retry, never a dead screen. Sentry captures; the user sees plain language. |
| Deleted quest | "The host cancelled this quest." Removed from Plans; if a room existed, it archives read-only so the chat history isn't destroyed. |
| Blocked user in a shared quest | Their messages and roster entry are hidden from you (and yours from them). Neither is told. The quest remains usable. |
| Ignored friend request | Silent. No notification to the sender, ever — matching `USER_FLOWS.md` §5. |
| Duplicate join / complete | `Idempotency-Key` header (already supported). A repeat complete returns `xp_awarded: 0` → **skip the reward animation**, go straight to the recap. Showing the celebration twice destroys its meaning. |
| Location denied | Neighborhood picker fallback. The app stays fully usable; only "nearby" degrades to "in this area". OS-blocked gets recovery instructions. |
| Quest starts while you're viewing it | Countdown flips to `● LIVE`; the CTA becomes `Join · started 2m ago` (still joinable) with no page reload. |
| You're alone at start time | Room shows: "Nobody else checked in." → `Wait 10 more minutes` · `Message the group` · `Leave — no penalty`. **Explicitly no XP penalty and no blame.** |
| Returning after 30+ days | Feed leads with "Welcome back" and *what's changed nearby*, not a guilt-framed streak. |
| First-time user | Feed shows one dismissible tip on the first hero card only. No tutorial overlay, no coach-mark carousel. |
| Suspended account | Clear reason, appeal path, read-only access to own history. |
| Deleted account's content | Author renders as "Former member". Content isn't retroactively destroyed (quest history other people participated in stays intact). |
| AI returns garbage | Fall back to the manual form pre-filled with whatever parsed. Never a dead end, never a raw error. |
| Photo verify says "no match" | Objective **still completes**. Verdict is a labeled advisory aside. This is a measured decision (58%/17%/25% in `docs/AI.md`), not a hedge. |

---

## K. Accessibility

Requirements, not aspirations. Each is checkable.

- **Contrast:** all text ≥ 4.5:1 (≥ 3:1 for ≥24px bold). Verified pairs in §H; `ink-3` is metadata-only. The dual `volt` / `volt-text` tokens exist specifically to prevent the light-mode contrast failure.
- **Never color alone:** every state carries an icon or text label. Selected chips get a check. Completion gets a checkmark, not just volt. Categories get icon + label.
- **Touch targets:** ≥ 44×44 CSS px, including 20px icon buttons (padded hit area). ≥ 8px between adjacent targets.
- **Dynamic type:** `rem`-based sizing; layouts tested to 200% text zoom without clipping or horizontal scroll. No fixed-height text containers.
- **Screen readers:** semantic landmarks (`header`/`nav`/`main`); one `h1` per screen with a correct heading order; `aria-label` on every icon-only control; `aria-live="polite"` for toasts, check-ins and incoming messages; countdowns throttled to one announcement per minute so they don't spam.
- **Focus:** visible `focus-visible` ring (2px `info`, 2px offset) on every interactive element. Sheets and modals trap focus and return it to the trigger on close.
- **Keyboard:** full app operable without a pointer. `Esc` closes sheets. Tab order follows visual order. A skip-to-content link.
- **Motion:** `prefers-reduced-motion: reduce` replaces all transforms with opacity fades, disables skeleton shimmer, and turns the reward sequence into a single fade. Already partially handled in `globals.css` — extended to cover the JS-driven sequences.
- **Forms:** persistent visible labels; errors tied via `aria-describedby`; error text names the fix, not just the failure.
- **i18n:** no clipped strings at Korean/Japanese lengths; CJK display overrides for case and tracking; RTL-safe logical properties (`padding-inline`, not `padding-left`) so a future Arabic locale isn't a rewrite.

---

## L. Design Principles

Twelve rules every future screen must satisfy.

1. **Time is the headline.** On any quest surface, time-to-start is the largest, brightest element. If something competes with it, that something is wrong.
2. **Show who before asking to commit.** No screen asks a user to meet strangers without showing them who those strangers are.
3. **One primary action per screen.** Exactly one volt button. If a screen seems to need two, the screen is really two screens.
4. **Volt means go.** The accent marks go / live / earned. Using it decoratively is a defect, not a style choice.
5. **Reward the outing, never the app-open.** No streaks, no login bonuses, no variable rewards, no artificial scarcity. Progress attaches to real-world completion only.
6. **Never render a dead end.** Every empty state, error and rejection carries a next action.
7. **Optimistic, then honest.** Reflect the user's action instantly; if the server disagrees, roll back visibly and say so plainly.
8. **Progressive disclosure by role.** Creator, business and admin surfaces exist only for users who hold that role. Complexity is earned, not paid up front.
9. **Icons carry meaning, emoji carry voice.** Lucide in all chrome. Emoji only in user-authored content.
10. **Safety is always one tap away and never suggested.** Report and block are reachable from every profile, quest and message, at low visual weight.
11. **AI proposes, humans commit.** No AI output reaches a real-world or financial consequence without an explicit, specific confirmation. No AI call on the hot path of a plain discovery request.
12. **Korean is not a translation.** Every layout, type treatment and string length is designed to work in Hangul first, not retrofitted.

---

## M. Design QA Checklist

Run this against any new or changed screen.

**Hierarchy**
- [ ] Exactly one primary (volt) action
- [ ] On quest surfaces, the countdown is the largest element
- [ ] One `h1`; heading levels descend without skipping
- [ ] A first-time user can name the primary action within 3 seconds

**Tokens**
- [ ] Zero hard-coded hex values, px sizes, or radii — tokens only
- [ ] Radius is one of: 16 / 12 / 12 / 24 / 999
- [ ] Vertical gaps are one of: 8 / 12 / 16 / 24 / 40
- [ ] Type is a named style from §H, not an ad-hoc size
- [ ] Numerals in countdowns, prices, XP and counts are tabular

**Color**
- [ ] `volt` used only for go / live / earned
- [ ] `volt-text` (not `volt`) for text on light backgrounds
- [ ] No state signalled by color alone
- [ ] Verified in dark, light, **and** system-default themes

**States** — all present, none "TODO"
- [ ] Loading (skeleton matching final dimensions)
- [ ] Empty (with an action)
- [ ] Error (retryable, plain language, no status codes)
- [ ] Offline
- [ ] Success feedback
- [ ] Disabled / permission-denied

**Interaction**
- [ ] Touch targets ≥ 44×44, ≥ 8px apart
- [ ] Primary CTA in the thumb zone on mobile
- [ ] Optimistic where a write is safe; rollback path exists
- [ ] Motion communicates a state change (nothing purely decorative)
- [ ] Sheets: drag handle, swipe-dismiss, backdrop tap, `Esc`

**Accessibility**
- [ ] Contrast checked, both themes
- [ ] Every icon-only control has an `aria-label`
- [ ] Keyboard-operable end to end; visible focus ring
- [ ] Correct under `prefers-reduced-motion`
- [ ] Legible at 200% text zoom, no horizontal scroll

**Content**
- [ ] Zero hardcoded strings — all through `next-intl`
- [ ] Verified at Korean string lengths
- [ ] Buttons name their consequence (no bare OK / Submit)
- [ ] Errors say what to do next
- [ ] CJK display overrides applied (case + tracking reset)

**Product**
- [ ] Report/block reachable if the screen shows user content
- [ ] No AI output causes a real-world or financial effect without explicit confirmation
- [ ] No engagement mechanic that manufactures urgency or shame
- [ ] Role-gated content hidden from users without the role

---

## Signature elements

Five things that should become recognizably SIDEQUEST — each earning its place functionally, not as decoration.

1. **The Countdown.** Time-to-start as the largest colored numeral on every quest surface, ticking live under an hour. Nothing in the category leads with time. It's memorable *because* it's the fastest possible answer to the only question that matters.
2. **Volt.** One chartreuse accent with one meaning. Instantly recognizable, and semantically rigid enough that users learn to scan for it.
3. **The Signal Row.** `45M · 1.2km · ₩15,000 · 2 left` — the same four-datum strip, same order, same tabular numerals, on cards, detail, room, notifications and push. Recognition over recall: users learn one shape and read it everywhere.
4. **The Roster.** Faces and first names of who's already in, *above* the Join button. Turns "meet strangers" into an informed decision, and doubles as the safety-vetting surface the app currently lacks entirely.
5. **The Cleared stamp.** A hard-edged overprint that lands on a completed quest with the XP count-up. One earned, fixed, honest reward at the emotional peak — no wheels, no boxes.

---

## Self-critique (senior review before launch)

Reviewed as if gating a launch. Problems found and fixed in the spec above:

| Problem found | Fix applied |
|---|---|
| **Six tabs.** An early draft had Tonight / Map / Create / Plans / Social / You. Six is over Hick's threshold for a bottom bar and Social overlapped both Plans and You. | Cut to five. Friends moved under You; time-critical social moved into Notifications, where it's actually seen. |
| **Countdown-first risked hurting scanability** — a wall of large numerals with no anchor. | Capped at **3** hero cards. Everything below Starting Soon uses compact rows with an inline countdown. Urgency that's everywhere is urgency nowhere. |
| **The reward moment was the aha moment.** That put the payoff 2+ hours after joining, with a 45-minute dead zone where users bail. | Moved the aha earlier: joining auto-opens the room with a prefilled opener, and the check-in strip provides immediate social proof that others are coming. |
| **`volt` as text failed light-mode contrast (1.3:1)** — a real accessibility bug that a single-accent system invites. | Split into `volt` (fill) and `volt-text` (`#5C7A00`, 4.8:1), with a QA line that catches misuse. |
| **Uppercase + negative tracking is hostile to Hangul**, and this is a Seoul-first product. | Added CJK display overrides resetting case and tracking, plus a principle and a QA item so it can't quietly regress. |
| **Manual creation was an 8-field wall** (current behavior). | Three steps with aggressive defaults ("tonight, next round hour", party of 4, free), and step 3 previews the real QuestCard. |
| **A duplicate `complete` would replay the celebration**, cheapening it. | The API already returns `xp_awarded: 0` on repeat; the spec now branches to the recap and skips the animation. |
| **Cold start was left as "an empty state with a CTA"** — fatal for a spontaneity app in a new neighborhood. | Promoted to a first-class three-rung flow with AI-seeded starter ideas. A bare empty feed cannot render. |
| **Nothing addressed being alone at start time** — the most demoralizing possible outcome. | Explicit state with three no-blame options and no XP penalty. |
| **Notifications badge could be inflated by ambient activity**, training users to ignore it. | Badge counts only "Needs you" and "Starting soon". |
| **Business/creator analytics were specified mobile-first** for what are genuinely data-table screens. | Marked desktop-primary in the responsive table. |

**Still open, deliberately:** push notification transport (no provider wired — in-app only for now); text search is specified but its backend endpoint doesn't exist yet (`GET /quests` has filters, no `q`); map clustering needs a real MapLibre pass; and `apps/mobile` inherits the tokens but its own screens are out of scope here.

---

## Implementation shape (not yet approved — for discussion)

Sequenced so the app is shippable after every stage.

| Stage | Work | Why first |
|---|---|---|
| **0. Foundation** | Rewrite `packages/design-tokens` (colors, type, spacing, radius, elevation) → new `globals.css` + `tailwind.config.ts`. Add Archivo + Pretendard. Add Lucide. | Everything else depends on it. No visual change yet. |
| **1. Primitives** | `Button` `IconButton` `Input` `Chip` `Badge` `Avatar` `Sheet` `Toast` `Skeleton` `EmptyState` `ErrorState`. Rendered in a `/dev/kitchen-sink` route for live review. | The live-preview surface. Everything after this is assembly. |
| **2. Quest grammar** | `Countdown` `SignalRow` `RosterStack` `QuestCard` (4 variants) `CompatBadge` `XPBar`. | The app's most-repeated components; consistency here does most of the work. |
| **3. Shell + IA** | New `AppShell`, 5-tab `TabBar`, header with search + notification bell, `Create` sheet. Route moves to un-orphan `/plan` `/map` `/bookings` `/marketplace` etc. | Fixes finding #3. Structural, low visual risk. |
| **4. Critical gaps** | **Notifications screen** (finding #1) and **public user profile** (finding #2). | These are missing features, not restyles — the highest product value in the whole rebuild. |
| **5. Core screens** | Tonight · Quest detail · Quest room · Reward moment. | The path the North Star metric runs through. |
| **6. Secondary** | Create flow · AI draft · Itinerary planner · Plans · You · Settings. | |
| **7. States & a11y** | Every empty/loading/error state. Full a11y pass. QA checklist against every screen. | The difference between "looks designed" and "is finished". |
| **8. Desktop** | ≥1024 sidebar + two-pane. Analytics screens. | Lowest traffic, highest width benefit. |

**Suggested first move:** stage 0 + 1 behind a `/dev/kitchen-sink` route, so the whole system is visible and adjustable live before a single product screen is touched.
