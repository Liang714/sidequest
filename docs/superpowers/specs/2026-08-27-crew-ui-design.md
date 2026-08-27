# SIDEQUEST — CREW: UI/UX System

**Date:** 2026-08-27
**Status:** design proposal, pending approval
**Scope:** `apps/web` + the token layer (`apps/mobile` inherits) + **a new presence API surface**
**Design language:** **CREW**
**Sibling doc:** [`2026-08-27-ui-rebuild-design.md`](2026-08-27-ui-rebuild-design.md) — the SIGNAL concept, reserved. Its §A1 codebase findings, §K accessibility bar and §M QA checklist are concept-independent and are carried forward here rather than repeated in full.

---

## 0. The thesis

> **You're not picking an activity. You're picking who you spend tonight with.**

The reason someone stays home on a free evening is almost never a shortage of things to do in Seoul. It's not knowing anyone to do them with. `PERSONAS.md` says this outright, twice: Erh's frustration is *"I have plans in my head but no one to do them with"*; Jamie's is wanting *"a social circle outside the office."* Neither says "I can't find activities."

So CREW inverts the card: **who's going is the headline, the activity is the subhead.** Quests remain the unit of *commitment*, but people become the unit of *discovery*.

### Why this is now the recommended concept

Two findings from the codebase changed the risk calculus:

**1. `PRD.md` §6 endorses this mechanic rather than forbidding it.** I had flagged "dating-app drift" as CREW's fatal risk. Read precisely, the non-goal is *"Appearance-based matching (matching is **interest/availability**/behavior-based)"*. Availability-based matching is named as the *intended* approach. An opt-in "I'm free tonight" signal is squarely on-thesis. The line to hold is that discovery is never **face-led** — which yields a hard, checkable design rule (§H, Rule of Faces).

**2. The friend loop is currently impossible, not merely weak.** `POST /friends/request` takes an `addressee_id` UUID. There is no user search, no public profile screen, no member directory, and no presence — verified across `docs/API.md` and `services/api/app/routers/`. **There is no path in the product to obtain another user's ID.** A friend request can only be sent by someone who already has a UUID by other means. So a people-discovery surface isn't an enhancement bolted onto CREW; it is the missing piece that makes the app's entire social half — a **Must** in `USER_STORIES.md` — actually function.

### What CREW keeps from SIGNAL

Time still matters; it just stops being the headline. The countdown moves from a 34px display numeral to a datum in the meta line and a color state on the card edge. Urgency is retained through *social* pressure ("Minji, Tae & Sora are looking for 2 more, starting in 45 min") rather than typographic pressure. Social scarcity is truer to the product than numeric scarcity, and it can't be gamed into FOMO spam.

### Assumptions

1. **Web is the real client.** `apps/mobile` is unbuilt; design is mobile-first, desktop adaptation specified in §H.
2. **Quest photography is sparse** — most quests are user-created with no image. CREW's visual system therefore leans on **avatars**, which do exist, rather than photography. This is why a people-led direction is materially easier to make look finished than a photo-led one.
3. **Push transport is not wired.** In-app notifications only; copy is written push-ready.
4. **Korean is first-class.** Type, layout and string lengths designed for Hangul first.
5. **Presence is new backend.** §G specifies the endpoints and table. Nothing in CREW's people surface can ship without them.

---

## A. Product UX Strategy

### Design philosophy

> **People are the headline. The plan is the subhead. Safety is structural, not a settings page.**

Three consequences that drive every screen:

- **Every discovery surface answers "who?" before "what?"** A card leads with a face stack and names. A person row leads with shared interests. The activity is always present but always second.
- **Presence is opt-in, time-boxed, and self-expiring.** Nobody is ever discoverable by default, and nobody stays discoverable by accident. This is the difference between a social product and a surveillance one.
- **Warmth is the visual argument.** CREW is deliberately the opposite of SIGNAL's condensed uppercase urgency: warm charcoal ground, cream ink, sentence case, round avatars, generous line-height. The interface should feel like an invitation, not an alert.

### Priority order for every decision

`Is it safe?` → `Does the user know who they'd be meeting?` → `Can they act in time?` → `Is the next step obvious?` → `Is it consistent?` → `Is it beautiful?`

Safety moves to first position — ahead of where SIGNAL had it — because CREW introduces stranger discovery, which SIGNAL did not. A people surface without safety design isn't a worse product; it's a liability.

---

## B. Target Users

| Persona | What CREW gives them that today's app cannot |
|---|---|
| **Erh, 24** — free weekday evenings, social circle is coworkers | The primary beneficiary. She can see that people near her are also free tonight, and join a crew that's already forming rather than cold-organizing one. Her stated frustration — *"by the time I've asked five people the moment has passed"* — is answered directly: the asking is already done. |
| **Jamie, 27** — expat, limited Korean, 8 months in | The biggest winner. A people surface with **interests, mutuals and an "EN OK" signal** is exactly the low-pressure entry an expat needs, and it's the only concept where "find people, not events" is the primary motion. Language compatibility becomes a visible row attribute, not a buried filter. |
| **@seoulwalker** — creator | Followers become legible. A creator's public profile carries completions and hosted-quest history, so local credibility compounds — currently there is no public profile at all. |
| **ABC Dance Studio** — business | Least served by CREW; sponsored quests still surface in the crews-forming feed with an honest `Sponsored` chip. Business analytics remain desktop-primary and unchanged. |

**Hard constraint (unchanged):** the first user in a neighborhood. CREW handles this better than SIGNAL — an empty city still has people in it. A feed of "3 people free near you" survives density that a quest feed cannot. See §J.

---

## C. Core User Journey

| Step | Objective | Interface | Primary CTA | Friction | Solution |
|---|---|---|---|---|---|
| **1. Landing** | "Is this for me?" | Real crews forming tonight in Seoul — face stacks, names, activities. | `See who's out tonight` | Skepticism. | Show real people forming real plans. Proof over promises. Avatars are generic-safe (initials fallback), so this works at low density. |
| **2. Sign up** | Get in fast | Email or social. | `Continue` | Verification blocking. | Non-blocking (already true in the API). Verification is required before the **first join or first invite** — the first actions with real-world consequence — not before browsing. |
| **3. Onboarding** | Make people relevant | 3 steps: interests → group size + vibe → location. | `Next` | Each step drops users. | Interests screen shows a live **"12 people near you share these"** counter. This is stronger than SIGNAL's quest counter because it survives low quest density and it previews CREW's actual value. |
| **4. First look** | See humans | Tonight: crews forming, then people free tonight. | `Join them` | Empty state. | Cold-start ladder, §J. |
| **5. Presence** | Become findable | Presence prompt **after** first browse, never before. | `I'm free tonight` | Privacy anxiety, correctly. | Ask only after they've seen the value. Default visibility **friends & mutuals**. Plain-language explanation of exactly what others see. Skippable forever; the app stays fully usable. |
| **6. Commit** | Join a crew | Quest detail, roster-led. | `Join them` | Meeting strangers. | Roster with interests, level, mutuals, tappable profiles — above the CTA. |
| **7. Aha** | "These are real people" | Room lights up: a real message, a real check-in. | `I'm here` | 45 min of dead air is where people bail. | Joining drops the user into the room with an editable opener. Warm copy: *"Say hi — it makes people more likely to show up."* The aha is social, and it lands in seconds. |
| **8. Completion** | Close the loop | Objectives → complete → **You met** | `Add friend` | Connections evaporate. | The peak-end screen. In CREW this isn't a bonus panel — it's the whole retention thesis, and the friend loop's only working entry point. |
| **9. Retention** | Return | Friend activity + presence of people you've met. | — | — | *"Sora is free tonight"* from someone you've actually met is the strongest possible return trigger, and it's honest — not manufactured urgency. |

**Retention thesis:** activity and availability from people you have met in real life. Not streaks. Not push spam. `PRD.md` §6 and `SECURITY.md` §Healthy engagement both forbid the alternatives, and CREW doesn't need them.

---

## D. Information Architecture

Five tabs. Everything reachable. Map becomes a **view toggle** on Tonight rather than a tab — CREW demotes place, but `/map` must not stay orphaned.

```
TONIGHT  (tab 1 — people & crews)                    [list ⇄ map toggle]
├── Presence toggle ........................... header — "I'm free tonight"
│   └── Presence composer ..................... sheet: window · visibility · note
├── Notifications ............................. header, badge
│   └── Needs you · Starting soon · Activity
├── CREWS FORMING ............................. quests, roster-led
│   └── Quest Detail
│       ├── Roster → Public profile
│       ├── Compatibility breakdown ........... sheet
│       ├── Why recommended? (AI) ............. sheet
│       ├── Invite someone ← NEW
│       └── Report quest
├── FREE TONIGHT .............................. people, interest-led
│   └── Public Profile  ← NEW, closes the friend loop
│       ├── Add friend
│       ├── Invite to a quest
│       ├── Shared history
│       └── Report / Block
└── Search .................................... quests + people (username)

ROOMS  (tab 2 — conversation is the product)
├── Active room (pinned, live dot)
│   └── Quest Room
│       ├── Chat
│       ├── Check in
│       ├── Objectives → Photo verify (advisory)
│       ├── Meeting point
│       ├── Roster → Public profile
│       ├── Invite someone
│       ├── Leave quest
│       └── Complete → You met
├── Upcoming rooms
└── Archived rooms (read-only)

CREATE  (tab 3 — center, action sheet)
├── Create a quest ............................ 3 steps
├── Generate with AI .......................... quota shown up front
└── Plan my night (AI itinerary) .............. un-orphans /plan

PLANS  (tab 4 — commitments)
├── Upcoming
├── Invitations ← NEW (quest invites)
├── Bookings .................................. un-orphans /bookings
└── History → Quest recap

YOU  (tab 5)
├── Profile — XP, level, achievements, stats
├── Friends
│   ├── Requests
│   └── Blocked
├── Achievements gallery
├── Marketplace ............................... un-orphans /marketplace
├── Creator Studio ............ [if creator]    un-orphans /creator
├── For Business .............. [if owner]      un-orphans /business
├── SIDEQUEST Pro ............................. un-orphans /subscription
├── Settings
│   ├── Account & email
│   ├── Privacy & visibility ← presence defaults live here
│   ├── Notifications
│   ├── Language & region
│   ├── Appearance
│   ├── Blocked users
│   ├── Legal
│   └── Delete account
└── Admin .................... [if admin]       un-orphans /admin
```

### Why these five

- **Rooms earns a tab.** In CREW the conversation *is* the product, not a sub-page of a quest. Today the room is buried at `/quests/[id]/room` with no path to it. When a quest is live, Rooms carries a mint dot and the room is one tap away.
- **Map is a toggle, not a tab.** CREW's thesis demotes place, but the screen exists and works; a `list ⇄ map` switch on Tonight keeps it alive without spending a tab slot on it.
- **Public Profile is the keystone.** It closes the friend loop, provides the vetting surface presence requires, and is currently absent entirely.
- **Friends stays under You**, because the *time-critical* half of social (requests, invites, presence) surfaces in Notifications and Tonight, where it's actually seen.

---

## E. Screen Inventory

### Essential (13)
Landing · Tonight (crews + people) · Tonight map view · Presence composer · Search (quests + people) · **Public profile** · Quest detail · Rooms list · Quest room · You met (reward) · Create quest · Plans · Own profile

### Secondary (14)
**Notifications** · Invite someone to a quest · Quest invitations · AI generate draft · AI itinerary planner · Compatibility breakdown · Achievements gallery · Quest history · Quest recap · Friends · Friend requests · Marketplace · Bookings · Pro / subscription

### Onboarding (6)
Welcome · Interests (live "N people share these") · Group size + vibe · Location · **Presence intro (post-browse)** · Handoff

### Auth (7)
Login · Register · Forgot password · Reset password · Verify email · Verification banner · Logged-out quest detail (shareable, gated at Join)

### Presence-specific (6) — new to CREW
Presence off (default) · Presence composer · Presence active (with remaining time) · Presence expired · Presence visibility explainer · Nobody free nearby

### Business / creator / admin (9)
Unchanged from SIGNAL §E.

### Empty states (13)
No crews forming · Nobody free nearby · No people match interests · No search results · No rooms · Empty room (first to join) · No plans · No invitations · No history · No friends · No friend requests · No notifications · No achievements

### Loading (7)
Crews skeleton · People skeleton · Profile skeleton · Room connecting · Map tiles · AI generating (streaming, cancellable) · Photo uploading

### Error (12)
Offline · 5xx · Quest full (409) · Quest cancelled · 403 · 429 · AI quota (402) · Paywalled quest (402) · Photo >8MB · WebSocket dropped · **Invite rate-limited** · **Presence set failed**

### Success (8)
Joined · Checked in · Objective done · Quest complete · Friend request sent · **Invite sent** · **Presence on (until 11 PM)** · Booking confirmed

### Permission (3)
Location (pre-prompt, denied fallback, OS-blocked recovery) · Camera · Notifications (after first join)

### Settings & account (9), Safety (7)
Settings index · Account & email · Privacy & visibility · Notifications · Language · Appearance · Blocked users · Legal · Delete account
Report user · Report quest · Report message · Block confirm · Post-block confirm · **Report from a people row** · **Hide from presence (soft, one-way)**

### Edge cases (11)
Returning after 30+ days · Quest starts while viewing · Host cancels · Alone at start time · Blocked user in a shared quest · Duplicate join · Deleted account's content · Suspended account · **Presence expires mid-session** · **Invited person joins a quest that then fills** · **Everyone nearby has presence off**

**Total ≈ 125 screens and states.**

---

## F. Detailed Screen Specifications

---

### F1. Tonight — the hero screen

**Primary goal:** get the user into a crew that's already forming, or into a conversation with someone who's also free.

**Visual hierarchy:** ① face stack → ② names ("Minji, Tae & Sora") → ③ what they're doing + when → ④ trust signals (mutual friend, match, EN OK) → ⑤ `Join them` → ⑥ the Free Tonight section.

```
┌──────────────────────────────────────┐
│ sidequest        [◍ map] [search][bell•]│
├──────────────────────────────────────┤
│  7 people are out                    │  display 30, sentence case
│  near you tonight                    │
│  3 of them share your interests      │  body-s, ink-2
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ◐ You're free until 11 PM   [edit]│ │  presence strip, mint when on
│ └──────────────────────────────────┘ │
│                                      │
│  CREWS FORMING                       │  label
│ ┌──────────────────────────────────┐ │
│ │ (M)(T)(S)                        │ │  46px avatars, overlapping
│ │ Minji, Tae & Sora                │ │  h2 21/800  ← the headline
│ │ are looking for 2 more           │ │  ink-2
│ │                                  │ │
│ │ Hongdae Photo Hunt · 9:00 PM     │ │  the activity, second
│ │ Exit 9, Hongik Univ. · 1.2km     │ │
│ │                                  │ │
│ │ [★ Sora is your friend] [94%]    │ │  trust chips
│ │ [EN OK]              starts 45m  │ │  time as a datum, not a headline
│ │ ┌──────────────────────────────┐ │ │
│ │ │         Join them            │ │ │  tangerine fill, ink text
│ │ └──────────────────────────────┘ │ │
│ └──────────────────────────────────┘ │
│  ...max 3 crew cards                 │
│                                      │
│  FREE TONIGHT, NO PLANS YET          │  label
│ ┌──────────────────────────────────┐ │
│ │ (J) Jamie                        │ │  32px avatar — deliberately small
│ │     Photography, cafés · EN OK   │ │  interests lead
│ │     under 1km · Lv 4 · 2 mutual  │ │  distance BAND, never exact
│ │                        [Invite]  │ │
│ └──────────────────────────────────┘ │
│  ...                                 │
└──────────────────────────────────────┘
 [Tonight] [Rooms•] (＋) [Plans] [You]
```

**The Rule of Faces (the guardrail that keeps this out of dating-app territory):**

| Surface | Avatar size | Leads with | Why |
|---|---|---|---|
| Crew card (people who already committed to a shared activity) | **46px**, overlapping stack | Faces + names | These people are co-committing to a public plan with you. Seeing them is the trust surface. |
| Person row (an individual, browsable) | **32px**, single, non-overlapping | **Shared interests** | Prevents face-led browsing. The scannable content is interests, distance band and mutuals — never appearance. |
| Profile header | 78px | Name + interests | You navigated here deliberately; this is not browsing. |

**No grid of faces exists anywhere in the product.** A photo grid is the single formal move that converts a social app into a dating app, and it is banned by this spec.

**Content rules:** max 3 crew cards before the people section — a wall of crews reads like a feed and buries CREW's differentiator. Sections render only when non-empty. Person rows show a **distance band** (`under 1km` / `1–3km` / `3–5km`), never a precise figure and never a map pin.

**Interactions:** tap crew card → quest detail · tap any face → public profile · tap `Join them` → optimistic join, then auto-open the room after 1.2s · tap person row → public profile · tap `Invite` → quest picker sheet (your upcoming quests, or create one) · long-press person row → Report / Hide from my presence view · pull to refresh · `◍` → map view of crews (people are **never** on the map).

**Feedback:** skeletons on load. Optimistic join with rollback + toast. Offline serves cached with a banner.

**UX rationale:** *social proof* is the entire mechanism — "Minji, Tae & Sora are looking for 2 more" is simultaneously the invitation, the trust signal and the urgency. *Recognition over recall*: "★ Sora is your friend" does more work than any amount of persuasive copy. Time is demoted to a datum because in CREW the pressure is social ("they need 2 more"), which is both truer and un-gameable into FOMO.

---

### F2. Public profile — the keystone screen

**Primary goal:** let a user decide whether they want to meet this person — on interests and history, never on looks.

```
┌──────────────────────────────────────┐
│ ←                              [⋯]   │
│                                      │
│              ( J )                   │  78px avatar, centered
│              Jamie                   │  h1 27, sentence case
│         Level 4 · 2 mutual friends   │  ink-2
│         ◐ Free tonight until 11 PM   │  mint, only if presence is on
│                                      │
│  "Been in Seoul 8 months, still      │  bio, optional
│   finding the good coffee."          │
│                                      │
│  INTO                                │
│  [Photography] [Cafés] [Walking]     │  shared interests highlighted mint
│  [Board games]                       │
│                                      │
│  SPEAKS                              │
│  English · Korean (beginner)         │  ← Jamie's core need, made visible
│                                      │
│  TOGETHER                            │
│  You've both completed 1 quest       │  shared history = strongest signal
│  Euljiro Print Crawl · 2 weeks ago   │
│                                      │
│  RECENTLY                            │
│  12 quests completed                 │  behavior, not appearance
│  ◆ Night Owl  ◆ Shutterbug           │  achievements as credibility
│                                      │
│  ┌────────────────┐┌───────────────┐ │
│  │  Add friend    ││ Invite to…    │ │
│  └────────────────┘└───────────────┘ │
│                                      │
│  Report · Block                      │  ink-3, always present
└──────────────────────────────────────┘
```

**Respects `visibility_settings`** — already enforced by `GET /users/{id}`. A friends-only profile shows name, avatar, level and the Add-friend action, and nothing else.

**Never shown:** exact location, last-seen, who viewed this profile, age, or any appearance-oriented field. **No photo gallery.**

**States:** stranger · pending request sent · friend · blocked by you · friends-only (restricted view) · deleted account ("Former member").

**UX rationale:** the section order is the argument. Interests → language → *shared history* → behavior. "You've both completed 1 quest" is the single most reassuring datum available and it costs nothing to compute. Appearance is structurally absent, which is how `PRD.md` §6 gets satisfied by the layout itself rather than by policy.

---

### F3. Presence composer

**Primary goal:** let someone become findable, with complete clarity about what they're exposing.

```
┌──────────────────────────────────────┐
│ ─────                                │
│  I'm free tonight                    │  h1
│  People nearby can see you're        │
│  around and invite you to a plan.    │
│                                      │
│  UNTIL                               │
│  [2 hours] [Until 11 PM] [All night] │  chips, "Until 11 PM" default
│                                      │
│  WHO CAN SEE ME                      │
│  ● Friends & mutual friends          │  ← DEFAULT
│  ○ Anyone nearby                     │
│                                      │
│  ADD A NOTE (optional)               │
│  ┌──────────────────────────────────┐│
│  │ Up for a café or a walk          ││  40 char max
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │  WHAT OTHERS SEE                 ││  live preview — recognition
│  │  (J) Jamie                       ││  over recall
│  │      Photography, cafés · EN OK  ││
│  │      under 1km · Lv 4 · 2 mutual ││
│  │      "Up for a café or a walk"   ││
│  └──────────────────────────────────┘│
│                                      │
│  They never see your exact location  │  the three guarantees,
│  — only a rough distance.            │  stated plainly
│  This turns itself off at 11 PM.     │
│  You'll never know who looked.       │
│                                      │
│  ┌──────────────────────────────────┐│
│  │      Go visible until 11 PM      ││
│  └──────────────────────────────────┘│
│  Not now                             │
└──────────────────────────────────────┘
```

**Design decisions, and why each one:**

| Decision | Reason |
|---|---|
| **Default = friends & mutuals** | The safe default is correct even though the product supports everyone-nearby. A user who wants wider reach opts into it deliberately; a user who taps through without reading is not accidentally exposed to strangers. |
| **Always time-boxed, hard cap 12h** | Presence that persists silently becomes a surveillance surface. Self-expiry means the worst case is bounded. |
| **Live "what others see" preview** | The single most effective privacy affordance available: show, don't describe. Eliminates the gap between what a user thinks they shared and what they shared. |
| **Distance bands, never coordinates** | Consistent with `SECURITY.md`'s location-privacy stance, which already forbids exposing a user's live position. A band is enough to decide; a coordinate is enough to follow someone. |
| **No viewer log** | Removes a stalking vector *and* an anxiety-driven engagement hook. "See who viewed you" is a dark pattern; its absence is a feature. |
| **Auto-clears when you join a quest** | You're no longer free. The state stays truthful without the user maintaining it. |
| **Declines are silent** | Consistent with `USER_FLOWS.md` §5's friend-request stance. No rejection notifications, ever. |

---

### F4. Rooms (tab) + Quest room

**Rooms list** — active room pinned with a live mint dot and a one-line "2 of 4 here"; upcoming below; archived read-only at the bottom.

**Quest room** reshapes by time, exactly as in SIGNAL §F3, but chat-dominant rather than logistics-dominant:

1. **Before start:** check-in strip + chat fill the screen. Objectives collapsed. Warm, logistical copy.
2. **During:** objectives expand and take primacy; chat collapses to a peek. `Wrap up` appears at scheduled end.
3. **After:** read-only archive; footer becomes `Add the people you met`.

```
┌──────────────────────────────────────┐
│ ←   Hongdae Photo Hunt          [⋯]  │
│     Starts in 45 min · 2 of 4 here   │  mint
├──────────────────────────────────────┤
│ (M)(T)(s)(j)              [I'm here] │  checked-in avatars get a mint ring;
│                                      │  not-yet at 42% opacity
├──────────────────────────────────────┤
│ (M) Minji                            │
│     ┌────────────────────────────┐   │
│     │ I'm at exit 9, black jacket│   │  bubble, 16px radius w/ 5px tail
│     └────────────────────────────┘   │
│              ┌──────────────────┐    │
│              │ On my way, 5 min │    │  tangerine, ink text
│              └──────────────────┘    │
│         Tae checked in               │  system event, centered, ink-3
├──────────────────────────────────────┤
│ Objectives                    0 of 3 │  collapsed pre-start
├──────────────────────────────────────┤
│ Message the crew…                    │  pill input
└──────────────────────────────────────┘
```

Objective completion stays **server-authoritative** — no client-broadcast completion frame, per the security decision documented in `docs/API.md`. Photo verify shows the AI verdict as a **labeled advisory aside**, never a gate, per the measured 58%/17%/25% accuracy in `docs/AI.md`.

---

### F5. You met — the peak-end screen

In CREW this is not a bonus panel. It is the retention thesis and the friend loop's primary working entry point.

```
┌──────────────────────────────────────┐
│              ✓                       │  mint check, scale-in
│         Quest complete               │  display 30, sentence case
│            +250 XP                   │  counts 0→250, mint, tabular
│                                      │
│  Level 7  ▓▓▓▓▓▓▓▓░░  2,840 / 3,500  │
│                                      │
│  NEW                                 │
│  ◆ Night Owl    ◆ Shutterbug         │  stagger in
│                                      │
│  YOU MET                             │  ← the point of the screen
│  (M) Minji                  [+ Add]  │
│  (T) Tae                    [+ Add]  │
│  (S) Sora            ★ friend        │
│                                      │
│  ┌──────────────────────────────────┐│
│  │          Add both                ││
│  └──────────────────────────────────┘│
│  Done                                │
└──────────────────────────────────────┘
```

**Motion:** check mark scale-in 220ms → XP count-up 700ms → level bar 400ms → achievements stagger 120ms → roster fades up last. ~1.6s total, tap-skippable, reduced to simple fades under `prefers-reduced-motion`.

**The reward is fixed and earned.** No wheel, no mystery box, no variable schedule — ruled out by `PRD.md` §6 and `SECURITY.md` §Healthy engagement, and unnecessary because the real-world experience is the reward. Asked once at the peak; never nagged afterward.

**A repeat `complete` returns `xp_awarded: 0`** (already true in the API) → skip the animation entirely, go straight to the recap. Replaying a celebration destroys its meaning.

---

### F6. Notifications

Identical structure to SIGNAL §F6 — three groups in fixed priority, actions resolved inline, badge counting only the first two groups so it can never be inflated by ambient activity. CREW adds two types: **quest invites** (`[Join] [Later]`) and, opt-in only, **"Sora is free tonight"** from people you've actually met.

The presence notification is deliberately restricted to prior real-world contacts. A "someone near you is free" broadcast from strangers would be spam and a safety problem; from someone you completed a quest with, it's the single best return trigger the product has.

---

## G. New API surface (required — none of this exists today)

CREW's people layer cannot ship without this. Specified here because it is a design decision as much as an engineering one.

### `user_presence` table
| Column | Notes |
|---|---|
| `user_id` | PK, FK → users |
| `until` | timestamptz, **required**, hard cap `now() + 12h` |
| `visibility` | enum `friends_mutuals` \| `everyone` — default `friends_mutuals` |
| `note` | varchar(40), nullable |
| `created_at` | timestamptz |

Index on `(until, visibility)`. Rows are never deleted on expiry — `until` in the past simply means invisible (auditable, and avoids a cron dependency).

### Endpoints
| Method | Path | Notes |
|---|---|---|
| `PUT` | `/presence` | `{ until, visibility, note? }`. Clamps `until` to ≤12h. Rate-limited 10/hr/user. |
| `DELETE` | `/presence` | Immediate invisibility. |
| `GET` | `/presence/me` | Current state + remaining time. |
| `GET` | `/presence/nearby` | `?lat&lng&radius_km&limit`. Returns **interest-led rows**: display name, avatar, interests, level, **distance band**, mutual count, note. Excludes: self, expired, blocked in **either** direction, and anyone whose `visibility=friends_mutuals` who isn't a friend or mutual. Never returns coordinates. |
| `POST` | `/quests/{id}/invite` | `{ user_id }`. **1 invite per recipient per 24h**, 20/day/user total. 403 if blocked either way. Creates a `quest_invite` notification. |
| `GET` | `/users/search` | `?q=` username prefix search, min 2 chars, rate-limited. Needed for the friend loop regardless of concept. |

### Safety requirements on this surface
- **Presence auto-clears** on joining a quest inside the window, and on block.
- **No viewer log** is recorded or exposed — by design, not omission.
- Every people row carries report and block, reachable in one tap.
- `GET /presence/nearby` is rate-limited per user to prevent enumeration of the local user base.
- **A soft one-way hide** ("don't show me this person") that isn't a block, for low-stakes avoidance without escalation.
- Presence rows are excluded for suspended and unverified accounts.

**This is the largest new attack surface the app has added since auth.** It warrants its own pass in `docs/SECURITY.md` before shipping, and a rate-limit review of every endpoint above.

---

## H. Design System — CREW

### Brand personality
**Warm · social · welcoming · confident.** Sentence case, never shouty. Round, generous, human. Deliberately the inverse of SIGNAL's condensed poster urgency — the interface should read as an invitation.

### Color

**Dark (primary)** — warm charcoal, not neutral black. The warmth is the whole point.
| Token | Hex | Use |
|---|---|---|
| `bg` | `#12100E` | Canvas |
| `surface` | `#1C1916` | Cards, rows |
| `surface-2` | `#241F1B` | Sheets, inputs, bubbles |
| `line` | `#332C26` | Hairlines |
| `ink` | `#FBF7F2` | Primary text (warm cream, not white) |
| `ink-2` | `#A79E96` | Secondary |
| `ink-3` | `#8A8178` | Tertiary, section labels, timestamps |
| **`hot`** | `#FF6A3D` | **Primary CTA, active nav, energy** |
| `hot-ink` | `#12100E` | Text on `hot` — see contrast note |
| **`mint`** | `#7BE0A4` | **Friend, confirmed, checked-in, XP, success** |
| `info` | `#8AA6FF` | AI surfaces, links, compatibility |
| `warn` | `#F5C36B` | Sponsored, pending |
| `danger` | `#FF6B5B` | Destructive |

**Light**
| Token | Hex |
|---|---|
| `bg` | `#FDFBF7` |
| `surface` | `#FFFFFF` |
| `surface-2` | `#F5F0E9` |
| `line` | `#E5DDD2` |
| `ink` | `#12100E` |
| `ink-2` | `#6B6259` |
| `ink-3` | `#797067` |
| `hot` (fill) | `#FF6A3D` |
| `hot-text` | `#C2410C` |
| `mint` (fill) | `#7BE0A4` |
| `mint-text` | `#17714A` |
| `info` | `#3355D4` |
| `warn` | `#8A5A00` |
| `danger` | `#C7362A` |

**Contrast — measured in-browser against the real render**, not calculated by hand. The audit script lives at `scripts/contrast-audit.py`; it walks the rendered DOM, resolves each element's effective background, and applies the WCAG AA threshold appropriate to its computed size and weight.

| Pair | Dark | Light | Verdict |
|---|---|---|---|
| `ink` on `bg` | 16.41 | 18.98 | ✓ |
| `ink-2` on `bg` | 7.21 | 5.78 | ✓ |
| `ink-3` on `bg` | 4.96 | 4.70 | ✓ (see note) |
| `hot` as text | 6.15 | 5.18 (`hot-text`) | ✓ |
| `mint` as text | 10.87 | 6.00 (`mint-text`) | ✓ |
| `info` as text | 7.48 | 6.19 | ✓ |
| `on-hot` on `hot` fill | 6.67 | 6.67 | ✓ — **use this** |
| **white on `hot` fill** | **2.5** | **2.5** | ✗ **FAILS — never do this** |
| **`mint` fill as text on light** | — | **1.6** | ✗ **FAILS** → use `mint-text` |
| **`hot` fill as text on light** | — | **3.1** | ✗ **FAILS** → use `hot-text` |

**Note on `ink-3`:** originally specced as `#726A63` / `#938A81` on the assumption that "metadata only" made 3:1 acceptable. The audit measured **3.58 / 3.28 — a real AA failure**, because `ink-3` carries section labels and timestamps (content, not decoration) at 11px, which does not qualify for the large-text exemption. Corrected to `#8A8178` / `#797067`. This is exactly the class of error a hand-calculated palette ships and a measured one doesn't.

**Catch 1: white text on tangerine is 2.5:1 and unusable.** The mockups showed white-on-tangerine buttons. Primary buttons are therefore **tangerine fill with near-black ink** (6.7:1). This looks *more* confident, not less — warmth comes from the palette as a whole, not from white-on-orange.

**Catch 2: both accents fail as text on light backgrounds**, so light mode carries separate `hot-text` and `mint-text` tokens. Single-accent-as-text is the most common contrast failure in warm palettes; the split tokens make the mistake structurally impossible.

**Semantic discipline:** `hot` = primary action / energy. `mint` = friend / confirmed / earned. `info` = AI / explanation. `warn` = paid / promoted. `danger` = destructive. Never chosen for looks. Categories get **icon + label**, never color alone.

### Typography

| Role | Family | Notes |
|---|---|---|
| Display + UI | **Figtree** | Warm geometric humanist, open source, Google Fonts. 700–800 display. **Sentence case** — the deliberate inverse of SIGNAL. |
| Hangul + all body | **Pretendard Variable** | Latin *and* Hangul in one family, full weight range. Self-hosted via `next/font/local`. Non-negotiable for a Seoul-first product. |
| Numerals | Figtree / Pretendard with `font-variant-numeric: tabular-nums` | No third family. |

| Style | Size / LH | Weight | Tracking |
|---|---|---|---|
| Display | 30 / 1.12 | 800 | −0.025em |
| H1 | 27 / 1.14 | 800 | −0.022em |
| H2 | 21 / 1.25 | 800 | −0.02em |
| H3 | 17 / 1.35 | 700 | −0.01em |
| Body | 16 / 1.55 | 400 | 0 |
| Body S | 14 / 1.5 | 400 | 0 |
| Caption | 12.5 / 1.4 | 500 | 0 |
| Label (micro) | 11 / 1.25 | 700 | +0.06em, uppercase |
| Numeric | 14 / 1.2 | 700 | 0, tabular |

Line-heights run **looser than SIGNAL's** (1.55 body vs 1.5, 1.12 display vs 0.92) — this is most of what makes CREW read as warm rather than urgent.

**Uppercase is reserved for micro labels only.** Never headlines. Hangul renders at normal case and normal tracking always; a `:lang(ko), :lang(ja), :lang(zh)` override resets `text-transform` and `letter-spacing` on every display style. CREW's sentence-case default makes this override far less load-bearing than it was in SIGNAL — a genuine advantage for a Korean-first product.

### Spacing
4px base: `2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Backward-compatible with the existing token package.
**Rhythm:** 16 gutter · 14 inside a card · 8 between related lines · 24 between sections · 40 above a section label. Only these five vertical gaps exist.

### Radius — rounder than SIGNAL
`card 22` · `button 16` · `input 14` · `bubble 16` (5px tail corner) · `sheet 28` · `pill 999` · `avatar 999`. Six values, no exceptions.

### Elevation
Warm-tinted, never neutral black.
| Level | Dark | Light |
|---|---|---|
| e1 card | `surface` + 1px `line` | `surface` + `0 1px 3px rgba(60,40,25,.06)` |
| e2 sheet | `surface-2` + 1px `line` | `surface` + `0 8px 28px rgba(60,40,25,.10)` |
| e3 modal | `surface-2` + scrim `rgba(10,8,6,.72)` + blur 8px | same + `0 16px 48px rgba(60,40,25,.16)` |

No glow treatments. CREW's depth is warmth and softness, not light emission.

### Icons
**Lucide** (open source, 1.5px stroke), sizes 16/20/24. **Emoji removed from all interface chrome** — inconsistent across platforms, can't take state color, and the loudest unfinished cue in the current build. Emoji remain valid inside user-authored chat.

### Components

| Component | Variants | States | Notes |
|---|---|---|---|
| **Button** | primary (`hot` fill + `hot-ink`) · secondary (outline) · ghost · danger | default · pressed (scale .97) · loading (width held) · disabled · success | 40/48/52. Min 44×44. |
| **Avatar** | 24 / 32 / 46 / 78 | image · deterministic initials fallback · checked-in (mint ring) · dimmed (not arrived, 42%) | Fallback color derived from user id — never random. Always tappable → profile. |
| **FaceStack** | 2–4 + overflow | — | 46px, −14px overlap, 3px `surface` border. **Crew cards only** — see Rule of Faces. |
| **PersonRow** | default · friend · pending · invited | — | 32px avatar, **interests lead**. Distance band only. Report/block via long-press. |
| **CrewCard** | forming · full · sponsored · joined · past | — | Face stack → names → activity → trust chips → CTA. One radius (22), one elevation (e1). |
| **Chip** | interest · trust · filter · language | default · selected · shared (mint) | Selected carries a check icon — never color alone. |
| **Badge** | `Sponsored` · `Pro` · `AI draft` · `EN OK` · `★ friend` · count | — | Micro label, uppercase. |
| **PresenceStrip** | off · on (with countdown) · expiring | — | Mint when on. Always shows remaining time and an edit affordance. |
| **ChatBubble** | mine (`hot`) · theirs (`surface-2`) · system (centered, ink-3) | sending · sent · failed | 16px radius, 5px tail. Failed shows retry. |
| **CheckInStrip** | — | 0/N … N/N | Mint fill. Avatars dim until arrival. |
| **XPBar** | segmented | filling · level-up | Mint fill, tabular label. |
| **CompatBadge** | inline chip | tappable → real breakdown | Never an opaque number. |
| **Sheet** | peek · half · full | dragging · settling | Drag handle, swipe-dismiss, backdrop tap, `Esc`, focus trap, returns focus to trigger. |
| **Modal** | confirm · destructive | — | Destructive confirmations only; everything else is a sheet. |
| **Toast** | info · success · error | with action · auto 4s | Above the tab bar. Never covers the primary CTA. Errors persist. |
| **Skeleton** | text · crew card · person row · avatar | shimmer (off under reduced-motion) | Matches final dimensions exactly. |
| **EmptyState** | illustrative · compact | — | **Always** carries an action. |
| **ErrorState** | inline · full · banner | retryable · terminal | Plain language, never a status code. |
| **TabBar** | 5 slots, center accent | active · badge · dot | Mint dot on Rooms when live. Safe-area padded. |

### Responsive
| Width | Adaptation |
|---|---|
| < 640 | Single column, 16px gutters, `max-w-[440px]`. Bottom tab bar. Sheets from bottom. |
| 640–1023 | Two-column crew grid; person rows stay full-width (a grid of people is the banned photo-grid pattern). Sheets become centered modals. |
| ≥ 1024 | Left sidebar replaces the tab bar. Two-pane: crews ‖ detail. Rooms becomes three-pane (rooms ‖ chat ‖ objectives) — the layout chat genuinely wants. Business/creator/admin analytics are **desktop-primary**. |

---

## I. UX Copy

Voice: **warm, direct, second person, present tense.** Sentence case. Short. No exclamation marks except the reward. Never "Oops!", never a bare status code.

**CTAs:** `Join them` · `Invite` · `I'm here` · `Add friend` · `Go visible until 11 PM` · `Complete quest` · `Publish` · `Delete my account`
Every destructive button names its consequence. No bare `OK` / `Submit` / `Confirm`.

**Onboarding**
- Welcome: **"Free tonight?"** / "Find people to spend it with."
- Interests: "What are you into?" / "Pick 3 or more — you can change these anytime." → live: **"12 people near you share these"**
- Group size + vibe: "How do you like to hang out?"
- Location: **"We'll show you who's close."** / "Others only ever see a rough distance — never where you are."
- Presence intro (post-browse): "Want people to know you're free?" / "You choose who can see you, and it turns itself off."

**Presence**
- Composer title: "I'm free tonight" / "People nearby can see you're around and invite you to a plan."
- Guarantees: "They never see your exact location — only a rough distance." · "This turns itself off at 11 PM." · "You'll never know who looked."
- Active strip: `You're free until 11 PM` · Expiring: `Visible for 15 more minutes` `Extend`
- Expired: "You're no longer visible." `Go visible again`
- Turned off: "You're hidden. People can still invite you if they know you."

**Empty states**
| Where | Copy | Action |
|---|---|---|
| No crews forming | "No crews forming near you right now." / "Start one — it takes about a minute." | `Create a quest` |
| Nobody free nearby | "Nobody's marked themselves free near you yet." / "You could be the first — people look for this." | `I'm free tonight` |
| No interest matches | "Nobody nearby shares your interests tonight." / "Try widening your distance." | `Widen to 10km` |
| No search results | "No people or quests match "neon"." | `Clear search` |
| No rooms | "No conversations yet." / "Join a crew and this fills up." | `See who's out` |
| Empty room | "You're first here." / "Say hi — it makes people more likely to show up." | prefilled opener |
| No plans | "Nothing on the calendar." | `See who's out` |
| No invitations | "No invitations right now." | — |
| No history | "Nothing completed yet." / "Your finished quests will live here." | `See who's out` |
| No friends | "No friends yet." / "The easiest way to make them is finishing a quest together." | `See who's out` |
| No notifications | "You're all caught up." | — |
| No achievements | "No badges yet." / "Finish your first quest to unlock three." | `See who's out` |

**Errors**
| Case | Copy |
|---|---|
| Offline | "You're offline. Showing what we last loaded." |
| 5xx | "Our side broke, not yours. Try again in a moment." `Retry` |
| 409 full | "This crew just filled up." `Notify me if a spot opens` |
| Cancelled | "The host cancelled this quest." `Find something else` |
| 403 | "You don't have access to this." |
| 429 | "Slow down a second — try again shortly." |
| Invite limit | "You've already invited Jamie today." |
| Invite daily cap | "That's your invites for today. They reset at midnight." |
| Presence failed | "Couldn't update your status. Try again." `Retry` |
| AI quota (402) | "You're out of AI generations today." `Buy 10` · `Go Pro` · `Create manually` |
| Paywalled (402) | "This is a paid quest from @seoulwalker." `Unlock — ₩4,900` |
| Photo >8MB | "That photo's over 8MB. Try a smaller one." |
| WS dropped | "Reconnecting…" (auto-clears silently) |
| Unverified | "Verify your email to join." `Resend` |

**Success**
`You're in. Open the room →` · `Invite sent to Jamie.` · `You're free until 11 PM.` · `Checked in. 3 of 4 here.` · `Objective done.` · `Quest complete. +250 XP` · `Request sent.` · `Booked. Fri 9:00 PM.`

**Confirmations**
- Leave (<2h): "Leave this crew?" / "Sora and 2 others are counting on you."
- Block: "Block Tae?" / "You won't see each other's quests, messages, or status. Any friendship is removed."
- Hide (soft): "Hide Jamie from your list?" / "They won't know. You can undo this in Settings."
- Delete account: "Delete your account?" / "Your quests, XP, and history go away. This can't be undone." → password re-entry.

**Notification copy (push-ready)**
- `Minji invited you to Hongdae Photo Hunt, 9:00 PM tonight.`
- `Photo Hunt starts in 30 minutes — Exit 9, Hongik Univ.`
- `Tae wants to be friends.`
- `Sora is free tonight.` *(only from people you've completed a quest with, opt-in)*
- `A spot opened in Euljiro Print Crawl.`

Never: "You haven't opened SIDEQUEST in a while", streak-loss framing, or "3 people looked at your profile" — the last one is impossible by design.

---

## J. Edge Cases

| Case | Handling |
|---|---|
| **Cold start — no crews** | CREW's advantage. Ladder: widen radius → show **people free tonight** (survives zero quest density) → AI-seeded starter ideas for this time and place, one tap to a prefilled draft → "be the first" + invite link. **A bare empty feed never renders.** |
| **Nobody free nearby either** | Honest and inviting, not apologetic: "Nobody's marked themselves free near you yet — you could be the first, people look for this." Turning on presence becomes the CTA. |
| Presence expires mid-session | Strip flips to expired state with a one-tap `Go visible again`. Never silently re-enabled. |
| Presence set while joining a quest | Auto-clears — you're no longer free. A toast says so, so it never feels like a bug. |
| Invited person joins, quest then fills | The invite resolves to `This crew filled up` with `Notify me if a spot opens`. The inviter is not notified of the failure (no blame loops). |
| Invite spam attempt | 1/recipient/24h and 20/day/user, enforced server-side. UI shows the remaining budget only when it's nearly exhausted. |
| Blocked user in a shared quest | Roster entry and messages hidden from you, and yours from them. Neither is told. The quest stays usable. |
| Ignored friend request / declined invite | Silent. No notification to the sender, ever. |
| Duplicate join / complete | `Idempotency-Key` header (already supported). Repeat complete → `xp_awarded: 0` → **skip the celebration**, go to the recap. |
| Location denied | Neighborhood picker fallback. Presence still works using the chosen neighborhood as a coarse anchor — arguably *more* private. |
| Quest starts while viewing | Card edge turns `danger`; CTA becomes `Join them · started 2m ago`, still joinable, no reload. |
| **Alone at start time** | "Nobody else checked in." → `Wait 10 more minutes` · `Message the crew` · `Leave — no penalty`. **No XP penalty, no blame.** |
| Returning after 30+ days | Leads with who's around now, not a guilt-framed streak. |
| First-time user | One dismissible tip on the first crew card. No tutorial overlay, no coach-mark carousel. |
| Suspended account | Clear reason, appeal path, read-only own history. Excluded from presence. |
| Unverified account | Can browse; cannot join, invite, or appear in presence. |
| Deleted account | Renders as "Former member". Shared quest history stays intact for other participants. |
| AI returns garbage | Falls back to the manual form pre-filled with whatever parsed. Never a dead end. |
| Photo verify says "no match" | Objective **still completes**. Verdict is a labeled advisory aside — a measured decision, not a hedge. |

---

## K. Accessibility

Carried forward from the SIGNAL doc §K in full, with CREW-specific additions:

- **Contrast:** all text ≥ 4.5:1 (≥3:1 for ≥24px bold). The `hot-text` / `mint-text` split tokens exist specifically to prevent the light-mode failures computed in §H. `ink-3` is metadata-only.
- **Never color alone:** checked-in state is a mint ring **plus** a check icon. "Shared interest" chips carry a marker, not just mint. Selected filters get a check.
- **Avatars are not information.** Every avatar is accompanied by a text name. An initials fallback is deterministic and has an `alt` of the person's name. Screen-reader users lose nothing by not seeing faces — which is only true because CREW never encodes meaning in appearance.
- **Touch targets:** ≥44×44 including 20px icon buttons. ≥8px between adjacent targets. Overlapping face stacks expand hit areas so the −14px overlap never creates a sub-44px target.
- **Dynamic type:** `rem` sizing, tested to 200% zoom without clipping or horizontal scroll.
- **Screen readers:** semantic landmarks, one `h1` per screen, `aria-label` on every icon-only control, `aria-live="polite"` for toasts, check-ins and incoming messages. Presence remaining-time announced at state change only, never on a timer.
- **Focus:** visible `focus-visible` ring (2px `info`, 2px offset) everywhere. Sheets trap focus and restore it on close.
- **Keyboard:** fully operable. `Esc` closes sheets. Skip-to-content link.
- **Motion:** `prefers-reduced-motion` replaces transforms with opacity fades, disables shimmer, collapses the reward sequence to one fade.
- **i18n:** no clipping at Korean/Japanese lengths; CJK case/tracking overrides; logical properties (`padding-inline`) throughout.

---

## L. Design Principles

1. **People are the headline.** Every discovery surface answers "who?" before "what?"
2. **Faces on rosters, interests on rows.** Face stacks appear only where people have already co-committed to a public plan. Individual browsing is interest-led. **No grid of faces exists anywhere.**
3. **Nobody is discoverable by default, and nobody stays discoverable by accident.** Presence is opt-in, time-boxed, self-expiring, and previewed before it's enabled.
4. **Show, don't describe, what you're sharing.** Any screen that exposes user data renders a live preview of exactly what others will see.
5. **Coarse is enough.** Distance bands, never coordinates. Enough to decide, not enough to follow.
6. **Silence on rejection.** Declines, ignores and hides never notify the other party.
7. **One primary action per screen.** Exactly one `hot` button. Two means it's really two screens.
8. **Reward the outing, never the app-open.** No streaks, no login bonuses, no variable rewards, no "who viewed you".
9. **Never render a dead end.** Every empty state, error and rejection carries a next action.
10. **Optimistic, then honest.** Reflect the action instantly; roll back visibly and say so plainly if the server disagrees.
11. **AI proposes, humans commit.** No AI output reaches a real-world or financial consequence without explicit, specific confirmation. No AI on the hot path of plain discovery.
12. **Safety is one tap away and never suggested.** Report and block reachable from every profile, quest, message and people row, at low visual weight.
13. **Korean is not a translation.** Sentence case by default makes this cheaper than it was in SIGNAL — lean on that.

---

## M. Design QA Checklist

The SIGNAL doc §M applies in full. CREW adds:

**Rule of Faces**
- [ ] No grid of faces anywhere
- [ ] Face stacks (46px) only on crew cards / rosters
- [ ] Person rows lead with interests; avatar ≤32px, non-overlapping
- [ ] No appearance-oriented field on any profile or row

**Presence & privacy**
- [ ] Presence is opt-in and shows remaining time wherever it's active
- [ ] Distance bands only — no coordinates, no person pins on the map
- [ ] Live "what others see" preview on any sharing screen
- [ ] No viewer log surfaced, computed, or stored
- [ ] Blocked users invisible in **both** directions on every people surface
- [ ] Report + block reachable from every people row
- [ ] Rate limits enforced server-side, surfaced in the UI only near exhaustion

**Color (CREW-specific)**
- [ ] `hot-ink` (near-black), **not white**, on `hot` fills
- [ ] `hot-text` / `mint-text` used for text on light backgrounds
- [ ] `mint` reserved for friend / confirmed / earned
- [ ] Verified in dark, light **and** system-default themes

**Type**
- [ ] Sentence case in headlines; uppercase only on micro labels
- [ ] Verified at Korean string lengths
- [ ] Tabular numerals on counts, XP, prices, times

---

## Signature elements

1. **The Face Stack.** Three 46px overlapping avatars as the largest element on a crew card. The first thing you see is who, not what.
2. **Name-led headlines.** *"Minji, Tae & Sora are looking for 2 more."* The invitation, the trust signal and the urgency in one sentence — and un-gameable into FOMO.
3. **"I'm free tonight."** A one-tap, self-expiring presence state with a live preview of what others see. The mechanic `PRD.md` §6 actually asked for.
4. **The mint marker.** One color meaning friend / confirmed / arrived / earned. Checked-in avatars get a mint ring; friends get a mint chip.
5. **"You met."** The peak-end screen that converts a finished quest into friendships — and the only working entry point to a friend loop that is currently impossible to complete.

---

## Self-critique

Reviewed as if gating a launch. Problems found and fixed above:

| Problem | Fix |
|---|---|
| **White-on-tangerine buttons in the mockups are 2.5:1** — a straight accessibility failure I shipped into the concept preview. | Primary buttons are `hot` fill with near-black `hot-ink` (6.7:1). Added to the QA checklist so it can't regress. |
| **Both accents fail as text on light backgrounds** (`hot` 3.1:1, `mint` 1.6:1). | Separate `hot-text` (#C2410C, 5.1:1) and `mint-text` (#17714A, 5.8:1) tokens. |
| **"The Face Stack" as a signature element was on a collision course with `PRD.md` §6.** Celebrating faces as the primary visual is exactly the dating-app drift I flagged. | Split into the **Rule of Faces**: faces on rosters (people already co-committed), interests on browsable rows, and no face grid anywhere. It's now a checkable rule, not an intention. |
| **Presence defaulting to "anyone nearby"** — which is what "opt-in presence" naively implies, and wrong. | Default `friends_mutuals`, explicit upgrade to everyone. A user who taps through without reading is not exposed to strangers. |
| **No cap on presence duration** in the first draft — presence would have become a silent always-on surveillance surface. | Required `until`, hard-capped at 12h, self-expiring, auto-clears on joining a quest. |
| **Losing time pressure entirely** would break the spontaneity premise the whole product rests on. | Time demoted to a datum and a card-edge color state, with urgency carried socially ("looking for 2 more"). Truer to the product and immune to FOMO abuse. |
| **"Nobody free nearby" was a second empty state stacked on the first** — the worst possible cold start. | Made an explicit, inviting state whose CTA is turning on your own presence. |
| **Invite spam was unbounded** in the first draft — a people surface with unlimited invites is a harassment vector. | 1/recipient/24h, 20/day/user, server-enforced, 403 on either-direction block. |
| **A two-column people grid at tablet width** would have recreated the banned photo-grid pattern by accident. | Person rows stay full-width at every breakpoint; only crew cards go two-column. |
| **Presence notifications from strangers** would be spam and a safety problem. | Restricted to people you've completed a quest with, opt-in. |

**Still open, deliberately:** push transport (in-app only for now); `GET /users/search` needs a backend endpoint; map clustering needs a real MapLibre pass; `apps/mobile` inherits tokens but its screens are out of scope; and **`docs/SECURITY.md` needs a dedicated pass on the presence surface before it ships** — it's the largest new attack surface since auth.

---

## Implementation shape

Sequenced so the app is shippable after every stage. Stages 0–4 are concept-independent — roughly 40% of the work — and were already true under SIGNAL.

| Stage | Work | Notes |
|---|---|---|
| **0. Foundation** | Rewrite `packages/design-tokens` (CREW colors incl. split text tokens, type, spacing, radius, elevation) → new `globals.css` + `tailwind.config.ts`. Add Figtree + Pretendard. Add Lucide. | No visual change yet. Everything depends on it. |
| **1. Primitives** | `Button` `Avatar` `Chip` `Badge` `Input` `Sheet` `Toast` `Skeleton` `EmptyState` `ErrorState` — rendered in `/dev/kitchen-sink` for live review. | **The live-preview surface.** Everything after is assembly. |
| **2. CREW grammar** | `FaceStack` `PersonRow` `CrewCard` `ChatBubble` `CheckInStrip` `PresenceStrip` `CompatBadge` `XPBar`. | Most-repeated components; consistency here does most of the work. |
| **3. Shell + IA** | New `AppShell`, 5-tab `TabBar`, header with presence toggle + search + bell, Create sheet, map toggle. Route moves to un-orphan `/plan` `/bookings` `/marketplace` etc. | Fixes the 27-routes-5-slots problem. |
| **4. Critical gaps** | **Notifications screen** and **public profile**. `GET /users/search`. | Missing features, not restyles. Highest product value, and the public profile is a hard prerequisite for stage 5. |
| **5. Presence (backend + UI)** | `user_presence` table, the six endpoints in §G, rate limits, block filtering, `SECURITY.md` pass. Then presence composer, strip, Free Tonight section. | **The riskiest stage.** Ship behind a flag; security review before enabling `visibility=everyone`. |
| **6. Core screens** | Tonight (crews + people) · Quest detail (roster-led) · Rooms tab · Quest room · You met. | The path the North Star metric runs through. |
| **7. Secondary** | Create flow · AI draft · Itinerary planner · Plans · Invitations · You · Settings. | |
| **8. States & a11y** | Every empty/loading/error state. Full a11y pass. QA checklist against every screen. | The difference between "looks designed" and "is finished". |
| **9. Desktop** | ≥1024 sidebar, two-pane crews, three-pane rooms. Analytics screens. | Lowest traffic, highest width benefit. |

**Recommended first move:** stages 0 + 1 behind `/dev/kitchen-sink`, so the entire CREW system is live and adjustable in your real app before a single product screen changes.

**Recommended gate:** do not start stage 5 until stage 4 has shipped. Presence without a public profile is a people surface with no way to vet anyone — the exact failure mode this design exists to prevent.
