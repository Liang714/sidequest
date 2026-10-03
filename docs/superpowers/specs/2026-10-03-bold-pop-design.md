# SIDEQUEST — BOLD POP: UI/UX & Motion System

**Date:** 2026-10-03
**Status:** implemented on web (tokens, primitives, motion); mobile specified, not built
**Scope:** `packages/design-tokens`, `apps/web`, and the spec `apps/mobile` will implement
**Replaces:** CREW ([`2026-08-27-crew-ui-design.md`](2026-08-27-crew-ui-design.md)). CREW's **information architecture, people-first card hierarchy, Rule of Faces, privacy rules and accessibility bar all carry forward unchanged.** Bold Pop replaces the *visual language and motion*, not the product thinking.
**Live reference:** `/dev/kitchen-sink` (dev builds) renders every primitive and motion below.

---

## 0. Decisions made before design

| Question | Decision | Why |
|---|---|---|
| Relationship to CREW | **Replace fully** | One system is cheaper to keep consistent than two. CREW's CSS-variable architecture meant re-pointing tokens restyled ~90% of screens with no per-screen edits. |
| Mobile stack | **Web first; mobile later** | `apps/mobile` is unscaffolded. This spec is platform-neutral, with React Native (Reanimated) notes in §4.8, so the mobile build implements it rather than re-deciding it. |
| Korean type | **System Korean fallback** | Space Grotesk and Archivo Black have no Hangul. Pretendard's variable build is 2.0MB on Korean mobile networks. Apple SD Gothic Neo / Malgun Gothic cost 0 bytes. |
| Dark mode | **Dropped (light only)** | The style depends on black outlines on a light canvas. A dark version inverts the outlines and becomes a different style. `next-themes` and the theme toggle were removed. |
| Display face | **Space Grotesk only** (not Archivo Black) | One 22KB variable file covers 400–700. Archivo Black would add a second font for headings only, and its width makes Korean/English mixed headlines uneven. |

### Audience

The brief names **university students**. The existing personas (`PERSONAS.md`) are mostly young professionals in Seoul. Their core problem is the same: *"I have plans in my head but no one to do them with"*. So this persona is added, not swapped in:

> **Dahye — 21, second-year at Hongik, lives in a dorm.** She has free gaps between classes and empty Friday nights. Her friends are scattered across majors. She's on her phone constantly, fluent in sticker/meme visual language, and allergic to anything that looks like a corporate app.
> - **Goal:** turn a free 2 hours into something worth posting about, with people who are also free *right now*.
> - **Frustration:** "Group chats die before anyone commits." She also doesn't trust apps that look like dating apps.
> - **Persona-defining moment:** sees "Minji, Tae & Sora are looking for 2 more" for a Hongdae photo hunt starting in 40 min. She taps Join, a confetti burst plays, and she's in the room chat before she's left the library.

Bold Pop is aimed at Dahye: loud, playful and screenshot-worthy. CREW's hierarchy (people first, activity second) keeps it from tipping into a dating app.

---

## 1. Brand and theme

### 1.1 Personality

**Loud, quirky, memorable.** Each screen should look like a page from a zine made with stickers and a black marker. It must stay legible, accessible and calm when the content is serious: safety reports, payments, deleting an account.

The rule that keeps it usable: **loudness lives in shapes, outlines and motion, not in the amount of colour.** Large surfaces stay cream and white. The three brand fills appear on small, deliberate things: buttons, stickers, badges and highlights.

### 1.2 Palette (brief values, verbatim)

| Brand | Hex | Role |
|---|---|---|
| Yellow | `#FFE14D` | Primary action, selection, energy |
| Blue | `#3B5BFF` | AI, links, secondary CTA |
| Pink | `#FF8FB1` | Friend, confirmed, arrived, earned |
| Black | `#000000` | Every outline, every hard shadow, ink |
| White | `#FFFFFF` | Card and field surfaces |

### 1.3 Semantic roles (token names in code)

Code keeps role names, not colour names, so a future rebrand is a token change. `hot`, `info` and `pink` are the brand colours; `warn` and `danger` are derived to sit beside them.

| Role | Fill | `on-*` (text on fill) | `*-text` (as text on canvas) | `*-soft` (tint) |
|---|---|---|---|---|
| canvas `bg` | `#FFFBEA` | — | ink `#000` 19.6:1 | — |
| `surface` | `#FFFFFF` | — | — | — |
| `surface-elevated` | `#F4F0E2` | — | — | — |
| **primary** `hot` | `#FFE14D` | `#000` **16.1:1** | `#2A44D6` 6.8:1 (links read blue) | `#FFF3B0` |
| **secondary** `info` | `#3B5BFF` | `#FFF` **5.1:1** | `#2A44D6` 6.8:1 | `#DDE3FF` |
| **success/social** `pink` | `#FF8FB1` | `#000` **9.8:1** | `#A3134C` 7.1:1 | `#FFE0EA` |
| **warning** `warn` | `#FF9F43` | `#000` **10.3:1** | `#9A4A00` 5.8:1 | `#FFE4CC` |
| **error** `danger` | `#FF5A5A` | `#000` **6.9:1** | `#B71C1C` 6.1:1 | `#FFDCDC` |
| `ink-muted` | — | — | `#404040` 9.9:1 | — |
| `ink-faint` | — | — | `#5C5C5C` 6.4:1 | — |

**Contrast checks (WCAG 2.2 AA; ratios computed from relative luminance):**

- **Fails, so forbidden:** yellow as text (1.3:1), pink as text (2.1:1), white on yellow (1.2:1), white on pink (2.1:1), white on `#FF5A5A` (2.9:1), blue text on yellow (3.9:1), blue text on pink (2.4:1).
- **Passes:** each `*-text` on its own `*-soft` tint: info 5.7, pink 5.1, warn 5.1, danger 5.2.
- **Non-text (3:1):** black outlines on canvas 19.6:1. Black icons on blue map pins 4.1:1.

The `fill` / `text` / `on` split is structural, so getting it wrong needs a deliberate misuse. `bg-hot` is a fill. `text-hot-text` is a different colour.

### 1.4 Why light-only

A dark Bold Pop needs white or yellow outlines on dark surfaces, and the hard shadows disappear on dark backgrounds. CREW's dark mode already found that shadows don't read on `#12100E`. That would be a second system to maintain. `color-scheme: light` is set so OS dark mode doesn't darken form controls.

---

## 2. Design system (shared across mobile and web)

Source of truth: `packages/design-tokens/tokens.ts`. Web consumes it through `apps/web/tailwind.config.ts` and CSS variables in `globals.css`. Mobile will consume it through NativeWind v4 (Tailwind v3.4 is pinned for that reason).

### 2.1 Typography

**Space Grotesk 400–700**, self-hosted as two unicode-range slices: latin 22KB and latin-ext 19KB. The latin slice is declared last, so latin-ext only downloads when a page needs a glyph from it. **Hangul** falls through per glyph to Apple SD Gothic Neo / Malgun Gothic / Noto Sans KR. Under `:lang(ko)`, headings step to weight 800 (system Korean faces are optically lighter), and tracking and uppercase are disabled.

| Style | Mobile | Web ≥768px | Line height | Weight | Tracking |
|---|---|---|---|---|---|
| `hero` | — | 56px | 0.98 | 700 | −0.04em |
| `display` | 34px | 34px | 1.04 | 700 | −0.035em |
| `h1` | 28px | 28px | 1.1 | 700 | −0.03em |
| `h2` | 22px | 22px | 1.2 | 700 | −0.02em |
| `h3` | 18px | 18px | 1.3 | 700 | −0.01em |
| `body` | 16px | 16px | 1.5 | 400 | 0 |
| `body-s` | 14px | 14px | 1.45 | 400 | 0 |
| `caption` | 13px | 13px | 1.35 | 500 | 0 |
| `label` | 11.5px | 11.5px | 1.2 | 700 | +0.08em, UPPERCASE |
| `numeric` | 14px | 14px | 1.2 | 700 | tabular-nums |

Sentence case everywhere except `label`. Emphasis inside a headline uses the `.marker` highlighter (a yellow band behind the lower 40% of the word), not colour or italics.

### 2.2 Spacing and grid

- **4px base.** Vertical rhythm uses only 8 / 12 / 16 / 24 / 40.
- **Mobile:** single column, 16px gutters, content max-width 512px (`max-w-lg`) even on desktop for app screens. The feed is a phone-shaped column by design.
- **Web marketing and wide screens:** 12-column grid, 24px gutters, 1200px max (see §3.4 breakpoints).

### 2.3 Shape, outline, elevation, iconography

| Token | Value | Notes |
|---|---|---|
| `border` (DEFAULT) | **2px** | Tailwind's 1px default is overridden, so every `border` is on-brand |
| `border-thick` | 3px | Hero stickers, the level badge |
| `line` | `#000` | No hairlines exist. Dividers are 2px black too. |
| radius `card` / `button` / `input` / `bubble` / `sheet` / `chip` | 18 / 14 / 12 / 16 / 24 / 999px | Chunky-friendly, not pill-soft |
| `shadow-e1` / `e2` / `e3` | `3px 3px 0 #000` / `5px 5px 0 #000` / `8px 8px 0 #000` | **Zero blur, always black, always bottom-right.** Never a soft shadow. |

- **e1:** buttons, chips, small cards.
- **e2:** feed cards, empty states, hero cards.
- **e3:** dialogs on desktop.

**Icons:** Lucide at 2px stroke (2.5px when active) to match the outline weight. There are no emoji in interface chrome.

**Stickers** are the decorative device: small outlined shapes in brand fills, rotated ±1–3°. Section labels, the XP chip, badges with `tilt`, and the level number all use them. **Only decorative elements rotate.** Text inputs, buttons and anything you need to read precisely stay square.

### 2.4 Core components (all states)

Every interactive component has these states: default, hover, pressed, focused, disabled, loading, error.

| Component | Default | Hover | Pressed | Focus | Disabled | Loading | Error |
|---|---|---|---|---|---|---|---|
| **Button** primary / secondary / info / danger | outlined slab, fill (yellow / white / blue / white with red text), e1 shadow | lift −1px, shadow 4px | translate +3px, shadow 0 (pushed flat) | 3px blue ring, 3px offset | dashed outline, no fill, no shadow, `ink-faint` text | label held invisible (no width change), spinner, keeps shadow, `aria-busy` | n/a (errors render beside the form) |
| **Button** ghost | text only | underline | — | ring | 40% opacity | spinner | — |
| **Input** | white, 2px black outline | — | — | fill → `hot-soft` **and** drops onto e1 | — | — | `aria-invalid` → one 320ms shake + `danger-soft` fill + error text |
| **Chip** | white, outlined | — | shadow 0 | ring | — | — | — |
| **Chip** selected | yellow, e1, check icon pops in (overshoot) | — | flattens | ring | — | — | — |
| **Card** (feed) | white, outlined, e2 | lift −2px, shadow 7px | pushes flat 5px | ring on the link | — | striped skeleton of identical size | `ErrorState` |
| **Tabs** (bottom nav) | icon + label, `ink-faint` | `ink` | — | ring | — | — | — |
| **Tabs** active | yellow outlined pill behind the tab, 2.5px icon stroke, morphs between tabs | — | — | — | — | — | — |
| **Navigation bar** (header) | logo sticker (yellow, e1, rotates −2° on hover) + icon buttons with an outline on hover | — | — | — | — | — | — |
| **Modal / bottom sheet** | white, outlined, sheet radius; mobile slides up, desktop pops in with e3 | — | — | focus trapped (native `<dialog>`) | — | — | — |
| **Toast** (spec only) | black slab, white text, e1, top-center, pops in | — | swipe to dismiss | — | — | — | pink outline for success, red for error |
| **Badge** | outlined solid fill, uppercase label; `tilt` adds −2° | — | — | — | — | — | — |
| **Empty state** | white card, e2, pops in; icon on a yellow sticker that wiggles once; a **required** action button | — | — | — | — | — | — |
| **Error state** | `danger-soft` card, e1, one shake on arrival, retry button | — | — | — | — | — | — |
| **Offline banner** | orange bar, black bold text, rises in | — | — | — | — | — | — |
| **Skeleton** | diagonal stripes sliding at 700ms (not a grey pulse) | — | — | — | — | — | stops under reduced motion |
| **XP bar** | 16px outlined track, striped pink fill, springs to width (700ms, pop curve) | — | — | — | — | — | — |

Disabled uses **three cues** (no fill, no shadow, dashed outline) because colour alone is never the only signal (§3.5).

### 2.5 Tokens for developers

- **TypeScript:** `packages/design-tokens/tokens.ts` exports `brand`, `color`, `font`, `spacing`, `radius`, `borderWidth`, `shadow`, `type`, `motion`, `avatar`.
- **CSS variables:** `apps/web/src/app/globals.css` `:root`, including `--pop-*`, `--accent-*`, `--on-*`, `--ease-*`, `--dur-*`.
- **Tailwind:** `bg-hot`, `text-on-hot`, `text-hot-text`, `bg-pop-yellow`, `shadow-e2`, `ease-snap`, `duration-instant`, `animate-pop-in`, …
- **Component classes:** `.pressable`, `.pressable-lg`, `.stagger`, `.skeleton-stripes`, `.reveal`, `.marker`.

JSON for design tools (mirrors `tokens.ts`):

```json
{
  "color": { "bg": "#FFFBEA", "surface": "#FFFFFF", "line": "#000000", "ink": "#000000",
    "hot": { "fill": "#FFE14D", "on": "#000000", "text": "#2A44D6", "soft": "#FFF3B0" },
    "info": { "fill": "#3B5BFF", "on": "#FFFFFF", "text": "#2A44D6", "soft": "#DDE3FF" },
    "pink": { "fill": "#FF8FB1", "on": "#000000", "text": "#A3134C", "soft": "#FFE0EA" },
    "warn": { "fill": "#FF9F43", "on": "#000000", "text": "#9A4A00", "soft": "#FFE4CC" },
    "danger": { "fill": "#FF5A5A", "on": "#000000", "text": "#B71C1C", "soft": "#FFDCDC" } },
  "shadow": { "e1": "3px 3px 0 #000", "e2": "5px 5px 0 #000", "e3": "8px 8px 0 #000" },
  "border": { "default": "2px", "thick": "3px" },
  "radius": { "card": 18, "button": 14, "input": 12, "bubble": 16, "sheet": 24, "chip": 999 },
  "motion": { "instant": 90, "fast": 150, "base": 250, "slow": 400, "celebrate": 900,
    "snap": [0.3, 0, 0.2, 1], "pop": [0.34, 1.56, 0.64, 1], "exit": [0.4, 0, 1, 1] }
}
```

### 2.6 Rule of Faces (carried from CREW, restyled)

- **46px overlapping face stacks appear only on crew cards**, where people have already committed to a public plan.
- **Browsable individuals** get a 32px non-overlapping avatar and lead with interests.
- There is no face grid anywhere.
- Avatars now carry a 2px black outline. Initials sit on a deterministic swatch: yellow, pink, light blue, orange, green, lilac or white. Every swatch carries black text at more than 9:1, and pure brand blue is excluded because it's only 4.1:1 at 13px.

---

## 3. UX structure

### 3.1 The three main journeys

1. **Free right now → in a crew** (Dahye; the North Star loop).
   Tonight feed → crew card ("Minji, Tae & Sora are looking for 2 more") → card morphs into the quest detail → roster above the CTA → Join → confetti → room chat → check-in on arrival → complete objectives → *quest complete* celebration (confetti, the check draws itself, XP sticker, level-up chip).
2. **Plan something → others join.**
   The + FAB (rotates 45° into ×) → create sheet (AI-assisted or manual) → three-step form with a chunky step bar → review step showing **the real feed card** → publish → the quest appears in Plans.
3. **Meet once → stay connected.**
   Completion screen → roster → public profile (interests lead, shared interests in pink) → friend request → it arrives in Notifications (needs-you group) → accepted → the friend badge (pink sticker) shows on future crew cards.

### 3.2 Information architecture

Carried from CREW: bottom navigation with five slots.

```
Tonight ─ Rooms ─ [ + Create ] ─ Plans ─ You
   │        │          │            │       ├─ Profile · XP · Achievements · History
   │        │          │            │       ├─ Friends
   │        │          │            │       └─ Settings (account, language, log out, delete)
   │        │          │            └─ Upcoming · Bookings
   │        │          └─ sheet: AI quest · Manual quest · Itinerary planner
   │        └─ live and upcoming quest rooms → /quests/[id]/room
   └─ feed: crews forming · for you · later tonight → /quests/[id] · /map
Header: logo sticker · Notifications · Settings
Unauthenticated: /login · /register · /forgot-password · /reset-password · /verify-email → /onboarding
Business / Creator / Admin / Marketplace / Subscription: reached from You and Settings
```

**Search:** still not shipped. There is no text-search endpoint (`GET /quests` has no `q`). When it ships, the header gets a search icon, and the screen opens as a full-height sheet with recent searches and category chips.

### 3.3 Screens (wireframe to high fidelity)

Each screen is described as layout, then Bold Pop treatment. ✅ = implemented on web in this change; ◻ = specified only.

| Screen | Layout (wireframe) | Bold Pop treatment |
|---|---|---|
| **Onboarding** ✅ | step bar → interests (chips) → location → done | Outlined 10px step bar fills yellow. Selected chips jump onto e1 with a check pop. Location pin icon in blue. The final step should end on a `DrawnCheck` (◻). |
| **Login / register** ✅ | brand → headline → fields → primary → links | Pink-dot wordmark. Fields fill yellow and drop a shadow on focus. Yellow pressable CTA. |
| **Home (Tonight)** ✅ | display headline (people out) → category chip scroller → *Crews forming* → *For you* → *Later tonight* | Section labels are black stickers tilted −1°. Cards rise in, 40ms apart. Urgent start times get a pulsing red dot plus red text. XP shows as a tilted pink sticker. |
| **Quest detail** ✅ | back → **header card** (badges, title, time) → description → roster → objectives → meeting point → why suggested → join | The header card is `hot-soft` on e2 and is the shared-element target of the feed card. Objectives sit in an outlined list with pink checks. |
| **Room** ✅ | check-in strip → objectives → chat → composer | Chat bubbles are outlined. Mine are yellow, theirs white, both on e1. A failed message goes dashed and `danger-soft`. Objective rows are pressable until done. |
| **Completion** ✅ | check → title → XP → level → achievements | Confetti, then `DrawnCheck`, then the title rises in, then the XP sticker pops (−2°), then the blue level chip, then achievements stagger in as pink stickers. |
| **Profile** ✅ | avatar → level and XP bar → achievements → history | Level number on a tilted yellow sticker. Striped XP bar. |
| **Settings** ✅ | account → preferences (language) → log out → danger zone | Theme toggle removed. Danger zone outlined, title in red text. |
| **Notifications** ✅ (restyle) | grouped: needs you · starting soon · activity | The unread dot in the header is a pink outlined dot that pops in. ◻ Group headers as black stickers. |
| **Search** ◻ | field → recent → category chips → results (crew cards) | Large yellow-focus field. Results reuse the feed card, so the shared-element morph still works. |

### 3.4 Responsive behaviour

| Breakpoint | Layout |
|---|---|
| < 640px (phone) | Single column, 16px gutters, bottom tab bar, sheets slide up from the bottom |
| 640–1023px (tablet) | App column stays 512px centred. Sheets become centred dialogs that pop in. Cards gain hover lift. |
| ≥ 1024px (desktop) | ◻ App column plus a right rail (map preview, your plans). Tab bar moves to a left rail with the same yellow active pill. Marketing pages use the 12-column grid and the `hero` type size. |

There is no horizontal page scroll at any width. This is verified at 390px and 1100–1280px on the kitchen sink and auth pages. The category chip row scrolls on purpose, inside its own container.

### 3.5 Accessibility

- **Touch targets:** at least 44×44px. Chips render smaller with `min-h-11`. Header icon buttons are 44px. The FAB is 56px.
- **Colour is never the only signal.** Selected chips have a check. Disabled is dashed with no shadow. Errors have text. Arrival has a ring plus "N of M here".
- **Focus:** a 3px blue outline with 3px offset on every interactive element, distinct from the black outline. Inputs also change fill and depth.
- **Screen readers:** the loading button sets `aria-busy` (not `disabled`). Tabs set `aria-current="page"`. Progress bars expose `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. Confetti and stickers are `aria-hidden`. Sheets use native `<dialog>` with an `aria-label`.
- **Reduced motion:** see §4.7.
- **Keyboard (web):** every action is reachable by Tab. Sheets trap focus, close on Escape and restore focus. Pressables show the press state on `:active`, which applies to keyboard activation too.

---

## 4. Motion and animation

### 4.1 Principles

1. **Snappy, not floaty.** The default curve, `snap` `(0.3, 0, 0.2, 1)`, is close to linear with a hard stop. Things arrive and stop, like a sticker slapped on.
2. **Physical press.** The press is linear and 90ms. It removes the shadow and moves the element by the shadow offset, so the element looks pushed into the page.
3. **Overshoot only for celebrating.** The `pop` curve `(0.34, 1.56, 0.64, 1)` is reserved for entrances that celebrate: stickers, badges, confetti, the check, a selected chip's check. It never runs on navigation or on errors.
4. **Exits accelerate away** with the `exit` curve `(0.4, 0, 1, 1)`. They are faster than entrances.
5. **Movement goes, meaning stays.** Every animation degrades under reduced motion to an instant end state, never to a missing state.

**Durations:** `instant` 90ms (press), `fast` 150ms (hover, toggles, colour), `base` 250ms (sheets, tabs, page transitions), `slow` 400ms (pop-ins, reveals), `celebrate` 900ms (confetti).

### 4.2 Screen transitions and shared-element transformations ✅

Implemented with the **View Transitions API** in `components/motion/transition-link.tsx`.

| Transition | Trigger | Duration and easing | What changes |
|---|---|---|---|
| Page root cross-fade | any `TransitionLink` / `useTransitionNavigate` navigation | out 120ms `exit`; in 200ms `snap`, 60ms delay | root opacity |
| **Card → detail morph** | tap a feed card | 250ms `snap` | The feed card and the detail `<header>` share `view-transition-name: quest-<id>`. The browser animates position, size and border-radius between them and cross-fades the content. |
| **Tab morph** | tap a bottom tab | 250ms `snap` | The yellow active pill (`view-transition-name: tab-indicator`) slides and resizes from the old tab to the new one |
| Header and tab bar hold | any navigation | — | Named `app-header` and `tab-bar`, so they stay put instead of fading |

How it works: `ViewTransitions` (in the locale layout) wraps `router.push` in `document.startViewTransition`. The update promise resolves in a layout effect when `usePathname()` changes, which is after the new route commits and before paint. A **1200ms cap** ends the wait, so a slow route never leaves the screen frozen. Browsers without the API, reduced-motion users and modified clicks get a plain navigation.

```css
::view-transition-old(root) { animation: 120ms var(--ease-exit) both vt-fade-out; }
::view-transition-new(root) { animation: 200ms var(--ease-snap) 60ms both vt-fade-in; }
::view-transition-group(*)  { animation-duration: var(--dur-base); animation-timing-function: var(--ease-snap); }
```

Sheets (`<dialog>`) are not route transitions. Mobile slides up (250ms `snap`) and desktop pops in (400ms `pop`). The scrim fades in linearly over 250ms. The CSS is keyed off `.sheet-panel`.

### 4.3 Micro-interactions

| Interaction | Trigger | Duration / easing | Properties | Status |
|---|---|---|---|---|
| Button / card press | `:active` | 90ms linear | `transform: translate(3px,3px)` (5px on cards), `box-shadow → 0` | ✅ `.pressable` / `.pressable-lg` |
| Hover lift | `:hover` (pointer devices only) | 90ms linear | translate(−1px, −1px), shadow +1px | ✅ |
| Chip select | click | check: 400ms `pop`; chip: 90ms | check scale 0.86→1.03→1, rotate −2°→0; chip gains e1 | ✅ |
| FAB open | click | 250ms `pop` | `+` rotates 45° to `×` (90° on hover) | ✅ |
| Toggle / switch | click | 150ms `snap` | knob translateX; track fill white → yellow; knob keeps a black outline | ◻ (no switch component yet) |
| Like / favourite | click | 300ms `pop` | heart scale 1→1.25→1 (`count-bump`), fill white → pink, 6 mini-confetti | ◻ (no like feature) |
| Pull to refresh | overscroll past 64px | spinner `spin-slow`; release 250ms `snap` | a sticker logo rotates with pull distance, then snaps back | ◻ mobile |
| Swipe (dismiss a notification) | horizontal drag | follows the finger; release 150ms `exit` | translateX, row tilts up to 3° with drag | ◻ mobile |
| Form validation error | submit with `aria-invalid` | 320ms linear | translateX ±6px ×2 (`shake`), fill → `danger-soft` | ✅ `inputClass`, `ErrorState` |
| Form validation success | field valid on blur | 250ms `pop` | a pink check pops in at the field's right edge | ◻ |
| Unread dot / live dot | appears | 400ms `pop` | scale-in sticker | ✅ |
| Urgent start time | starts within 60 min | 2s pulse | red dot opacity | ✅ |

### 4.4 Loading

- **Skeletons** ✅ match the final layout's dimensions exactly. They use diagonal stripes sliding 28px per 700ms, linear. Under reduced motion the stripes stay but don't move.
- **Button loading** ✅: spinner over an invisible label, so the width never changes.
- **Animated empty states** ✅: the card pops in, then the yellow icon sticker wiggles once (±8°, 400ms, starting at 250ms).
- **Page progress** ◻: a 3px yellow bar with a black bottom border across the top during navigation longer than 300ms.

### 4.5 Onboarding and celebrations

| Moment | Sequence | Status |
|---|---|---|
| **Quest complete** | t=0 `Confetti` (28 pieces; 40 on level-up; brand fills with black outlines, 1100ms, up and out then falling) · t=0 `DrawnCheck` circle pops (400ms `pop`) · t=120ms check stroke draws (250ms `snap`, `stroke-dashoffset` 24→0) · t=150ms title rises · t=300ms XP sticker pops at −2° · t=450ms level chip pops · t≥480ms achievements stagger at 40ms each | ✅ `components/motion/celebrate.tsx` |
| Join a crew | `Confetti` (20) from the CTA, then the button morphs into "Open room" | ◻ |
| Onboarding complete | `DrawnCheck`, then a "You're set" headline with a `.marker` highlight sweep (background-size 0→100%, 400ms `snap`) | ◻ |
| Progress reward | XP bar springs to its new width (700ms `pop`); the number counts up over 600ms | ✅ bar / ◻ count-up |

Confetti is dependency-free (CSS keyframes plus seeded random offsets) and adds 0KB of libraries.

### 4.6 Scroll effects (website)

- **Reveal-on-scroll** ✅: `.reveal` uses CSS scroll-driven animations (`animation-timeline: view()`, range `entry 0%`–`entry 40%`, `rise-in`). It runs off the main thread with no IntersectionObserver. It's wrapped in `@supports`, so unsupported browsers show the content immediately and nothing can stay hidden.
- **Sticky header** ✅: the solid canvas with a 2px bottom outline stays sticky. ◻ Past 8px of scroll, the logo sticker shrinks from h3 to caption size (150ms `snap`).
- **Parallax** ◻ (marketing pages only, never in the app): background stickers move at 0.6× scroll via `animation-timeline: scroll()`; translateY only.

### 4.7 Reduced motion

`@media (prefers-reduced-motion: reduce)`:

- All animations and transitions are cut to 0.01ms with no delay, so they land on their final frame.
- Pressables stop translating; the shadow change still shows the press.
- View transitions are skipped in JS.
- `Confetti` renders nothing. `DrawnCheck` renders already drawn.
- Skeleton stripes and the urgent pulse stop.

### 4.8 Logo animation and splash ◻

- **Logo:** "SIDEQUEST" set in Space Grotesk 700 uppercase on a yellow sticker with a black outline and e1, rotated −2°.
- **Splash (web: first load only; mobile: launch screen to first frame):**
  1. Canvas `#FFFBEA`.
  2. The sticker drops in from scale 0.6 (400ms `pop`).
  3. The shadow slides out from 0 to 5px (150ms linear).
  4. Three brand dots pop in, 60ms apart.
  5. The whole group exits at scale 1→0.9 with opacity 0 (150ms `exit`).

  Total under 900ms. It never blocks content that is already available.
- **Export:** a Lottie JSON from the same keyframes for iOS and Android launch, plus an SVG/CSS version for web.

### 4.9 Implementation code

**Web (shipped):** CSS keyframes in `tailwind.config.ts` and `globals.css`. The utilities are `animate-pop-in`, `animate-rise-in`, `animate-shake`, `animate-wiggle`, `animate-stripes`, `animate-check-draw` and `animate-count-bump`. The `.pressable` classes, `TransitionLink` and `Confetti` / `DrawnCheck` complete the set. No animation library was added (framer-motion would cost ~35KB gz for effects CSS already covers).

**Mobile (for `apps/mobile`, React Native + Reanimated 3):**

```tsx
// Pressable slab — same numbers as .pressable
const pressed = useSharedValue(0);
const style = useAnimatedStyle(() => ({
  transform: [{ translateX: pressed.value * 3 }, { translateY: pressed.value * 3 }],
  shadowOffset: { width: 3 - pressed.value * 3, height: 3 - pressed.value * 3 },
  shadowOpacity: 1, shadowRadius: 0, shadowColor: "#000",      // iOS hard shadow
}));
<Pressable
  onPressIn={() => { pressed.value = withTiming(1, { duration: 90, easing: Easing.linear }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
  onPressOut={() => { pressed.value = withTiming(0, { duration: 90, easing: Easing.linear }); }}
>
  <Animated.View style={[styles.slab, style]} />
</Pressable>

// Sticker pop-in
entering={ZoomIn.duration(400).easing(Easing.bezier(0.34, 1.56, 0.64, 1))}

// Shared element: card → detail
<Animated.View sharedTransitionTag={`quest-${id}`} />
```

Android has no zero-blur offset shadow, so draw it as a black `View` behind the slab, offset by 3px. Respect `AccessibilityInfo.isReduceMotionEnabled()` exactly as §4.7 does.

---

## 5. Experience details

### 5.1 Haptics and sound (mobile)

| Event | Haptic | Sound |
|---|---|---|
| Press on a pressable | `impactLight` on press-in | none |
| Chip select | `selection` | none |
| Join a crew, check in | `notificationSuccess` | optional short "pop" (off by default, toggle in Settings) |
| Quest complete, level up | `notificationSuccess` + a `impactMedium` double tap at the XP pop | optional "level up" chime |
| Validation error | `notificationError` | none |

Sound is **off by default**. The app is used on the street and in classrooms.

### 5.2 Errors, offline, permissions

- **Errors** never show status codes (`ErrorState` takes written copy). Voice: blunt and on our side ("Our side broke, not yours."). Every error has a retry or a next step.
- **Offline:** an orange `OfflineBanner` under the header ("You're offline. Showing what we last loaded."). It never covers the primary CTA. Composer messages queue and show `sending`, and turn dashed and `failed` with retry if they don't send.
- **Permissions (location, camera, notifications):** always pre-ask with an in-app sheet that explains why in one line ("So we can show crews within walking distance"), with *Allow* (primary) and *Not now* (ghost). Only Allow triggers the OS prompt. On denial, show a persistent inline card with a Settings deep-link. Never re-prompt on a timer.

### 5.3 Personalisation, notifications, re-engagement

- **Personalisation:** interests from onboarding feed "For you" (content-based, `docs/AI.md`). Shared interests show as pink chips on profiles. The compatibility badge always opens its breakdown.
- **Notifications:** grouped as *needs you* (invites, requests), *starting soon*, and *activity*. Only the first two count toward the header dot, so ambient activity can't inflate it. Copy is push-ready; push transport is still unwired.
- **Re-engagement:** at most one "free tonight?" nudge per day, sent only if the user has marked themselves usually free at that time. Streaks are shown, never punished. **Sponsored** content always literally says "Sponsored" (orange badge). Paid placement is never disguised.

### 5.4 Performance

- **60fps:** every animation touches only `transform` and `opacity`. The exceptions are `box-shadow` on the press, which is short and small-area, and the XP bar width, which changes once. Reveals run on the compositor via scroll timelines. View transitions are browser-native.
- **Fonts:** 22KB for the common case; latin-ext 19KB only on demand; Korean costs 0 bytes.
- **No new runtime dependencies.** `next-themes` was removed (−1 dependency).
- **Images:** `next/image` with explicit sizes; avatars 32 / 46 / 78px at 2×; lazy below the fold.
- **Skeletons** at exact final dimensions mean no layout shift on load (CLS target 0).

---

## 6. Deliverables

### 6.1 Design rationale (key decisions)

- **Role tokens over colour tokens:** `hot` / `info` / `pink` rather than `yellow` / `blue`, so a rebrand is a token change and the fill/text split stays enforced.
- **Links are blue, not yellow:** yellow is illegible as text. Blue is the one brand colour that passes as text, so `hot-text` resolves to blue.
- **Pink means social:** friend, confirmed, arrived and earned. It replaces CREW's mint, and the code renamed `mint` to `pink`.
- **2px default border:** overriding Tailwind's default made about 100 existing `border` usages on-brand with no per-screen edits.
- **Press = remove the shadow:** this is the most recognisable interaction in the neo-brutalist style, and it gives clear feedback without any colour change.
- **CSS-only motion:** effects stay cheap, need no libraries, work on the server render, and reduced-motion handling is a single global rule.

### 6.2 Screen-by-screen component usage

| Screen | Components |
|---|---|
| Tonight | `AppShell`, `CategoryChip`, `QuestCard` → `QuestCardView` (`FaceStack`, `Badge`), `TransitionLink`, `EmptyState`, `TabBar` |
| Quest detail | `Badge`, header card (`vtName`), `QuestRoster` (`Avatar`), `CompatibilityBadge`, `JoinQuestAction`, `BookActivityWidget` |
| Room | `CheckInStrip`, `ChatBubble`, objective rows (`.pressable`), `Confetti`, `DrawnCheck` |
| Create | `CreateSheet` (`Sheet`), `CreateQuestForm` (step bar, `Field`/`inputClass`, `QuestCardView` preview) |
| Profile | `XpBar`, achievements, `QuestHistoryItem` |
| Auth | `Field`, `inputClass`, primary pressable buttons |
| Settings | `Badge`, `LocaleSwitcher`, `Button` secondary, `DeleteAccountForm` |

### 6.3 Front-end code (web)

Next.js 15 + Tailwind 3.4, in this repository:

- tokens: `packages/design-tokens/tokens.ts`
- Tailwind config: `apps/web/tailwind.config.ts`
- global styles: `apps/web/src/app/globals.css`
- primitives: `apps/web/src/components/ui/*`
- motion: `apps/web/src/components/motion/*`
- living reference: `/dev/kitchen-sink`

### 6.4 Mobile code

Deferred until `apps/mobile` is scaffolded (see Decisions). §4.9 gives the Reanimated equivalents. The token package is already NativeWind-compatible.

### 6.5 Developer handoff checklist

- [ ] Use role tokens (`bg-hot`, `text-on-hot`, `text-hot-text`). Never use a hex value in a component, and never use a `fill` as text.
- [ ] Every interactive slab uses `.pressable` (or `Button`). Don't hand-roll press states.
- [ ] Use only `shadow-e1` / `e2` / `e3`. No `shadow-md` or other blurred shadows.
- [ ] New animations use `ease-snap` / `ease-pop` / `ease-exit` and `duration-instant` / `fast` / `base` / `slow`. Use `pop` only for celebratory entrances.
- [ ] New animations still make sense with reduced motion on (check in DevTools → Rendering).
- [ ] Navigations that should animate use `TransitionLink`. Keep `view-transition-name` values unique on the page (use `vtName()`).
- [ ] Every empty state has an action. Every error has written copy and a next step.
- [ ] Touch targets are at least 44px. Every interactive element shows visible focus.
- [ ] No horizontal page scroll at 360px.
- [ ] Check Korean: no uppercase or tracking on Hangul, and text fits at ko string lengths.
- [ ] Remove the remaining legacy aliases (`blue` / `lime` / `violet` / `coral`, `font-mono`) as screens are touched.

### 6.6 Usability testing plan

- **Who:** 6 Seoul university students (3 Korean-first, 2 international, 1 who uses a screen reader or reduced motion), 30 minutes each, on their own phones.
- **Tasks:**
  1. From cold, find a crew starting within an hour and join it.
  2. Check in and complete one objective.
  3. Create a quest with AI.
  4. Find and add someone you met as a friend.
  5. Log out, then delete the test account.
- **Measure:** task success, time on task, mis-taps (especially on chips and the FAB), and whether participants notice the card→detail morph without being asked. Probe: "Does this look like a dating app?" (must be *no*).
- **Ask after each task:** SEQ, plus "what did that animation tell you?" (tests whether motion carries meaning).
- **Pass bar:** 5 of 6 succeed on tasks 1–3. Nobody misreads disabled as pressed. Nobody reports motion discomfort; if anyone does, re-test with reduced motion.

---

## 7. What changed in code (this round)

- Tokens, Tailwind config and `globals.css` rewritten for Bold Pop; light-only; `next-themes` and the theme toggle removed.
- Space Grotesk self-hosted; Figtree and Geist Mono removed.
- `mint` role renamed to `pink`; `ease-crew` to `ease-snap`.
- Primitives restyled: `Button` (+`info` variant), `Chip`, `Badge` (+`tilt`), `Sheet`, `Avatar`, `States`, `Progress`, `ChatBubble`.
- `TabBar` (morphing indicator, FAB) and `AppShell` (sticker logo) restyled.
- New `components/motion/transition-link.tsx`: View Transitions with card→detail and tab morphs.
- New `components/motion/celebrate.tsx`: `Confetti` and `DrawnCheck`, wired into quest completion.
- Feed stagger, detail header card, outlined objectives.
- Legacy-alias primary buttons on auth, creator, business, subscription and booking screens converted to pressable Bold Pop buttons; `inputClass` restyled.
- Kitchen sink rebuilt, with live motion demos.
