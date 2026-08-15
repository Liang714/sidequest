# Design System — SIDEQUEST

Gamified + clean + modern + urban. Reads as premium software first,
game-adjacent second — never the reverse. Dark-first, with light as a fully
supported alternate, not an afterthought. Tokens live in
`packages/design-tokens` as a single Tailwind config consumed by both
`apps/web` (Tailwind CSS) and `apps/mobile` (NativeWind v4) — see
[ARCHITECTURE.md](ARCHITECTURE.md).

A visual reference build of everything below ships as a companion artifact
alongside this doc.

## Color

| Token | Dark | Light | Usage |
|---|---|---|---|
| `bg` | `#0B0B0F` | `#FAFAFA` | App background |
| `surface` | `#16161D` | `#FFFFFF` | Cards, sheets |
| `surface-elevated` | `#1D1D26` | `#F1F1F5` | Modals, popovers |
| `border` | `#2A2A35` | `#E4E4EA` | Dividers, card outlines |
| `text-primary` | `#F5F5F7` | `#14141B` | Headings, primary content |
| `text-secondary` | `#9C9CA8` | `#6B6B76` | Meta text, captions |
| `accent-blue` (primary) | `#4C6FFF` | `#3854E0` | Primary CTAs, links, focus states |
| `accent-lime` (success) | `#B4FF39` | `#7FBF00` | XP, completion, positive states |
| `accent-violet` (premium) | `#9D6BFF` | `#7C4FE0` | Premium/creator features |
| `accent-coral` (caution) | `#FF6B5B` | `#E0473A` | Destructive/warning actions (leave, report, block) |

Accents are used as **highlights and glows in dark mode, solid fills/borders
in light mode** — never flooded across large surfaces. This is the line
between "premium app with gaming energy" and "gaming website," per the
product brief.

## Typography

- **Headings & numerals that need to read at a glance** (titles, XP counts,
  prices, countdowns): **Geist Sans** — open-source, free, geometric.
  Numeric displays (XP bar, price, countdown) use **Geist Mono** for tabular
  alignment.
- **Body copy:** system font stack (`-apple-system, Roboto, ...`) for load
  performance and native feel on each platform.

| Style | Size / Line-height | Weight |
|---|---|---|
| Display | 32 / 1.2 | 700 |
| H1 | 28 / 1.25 | 700 |
| H2 | 22 / 1.3 | 600 |
| H3 | 18 / 1.35 | 600 |
| Body | 16 / 1.5 | 400 |
| Body Small | 14 / 1.5 | 400 |
| Caption | 12 / 1.4 | 500 |

## Spacing & radius

4px base scale: `4, 8, 12, 16, 24, 32, 48, 64`. Card radius `20px` (rounded
enough to feel collectible, not pill-shaped); button radius `12px`; chips
`999px` (full pill).

## Core components

**QuestCard** — the primary collectible unit of the app:

```
┌───────────────────────────┐
│ 📸                       │
│                           │
│ HONGDAE PHOTO HUNT        │
│                           │
│ 📍 Hongdae                │
│ 🕘 8:00 PM               │
│ 💰 ₩15,000               │
│ 👥 3/5                    │
│                           │
│ +250 XP                   │
│                           │
│       [ JOIN QUEST ]      │
└───────────────────────────┘
```

Category emoji/icon top-left, title in H2/Geist Sans, metadata row in Body
Small + `text-secondary`, XP reward in `accent-lime` + Geist Mono, primary
CTA in `accent-blue`.

**CompatibilityBadge** — circular percentage ring (`accent-blue` → `accent-
lime` gradient by score) that expands to a breakdown on tap:

```
94% Quest Compatibility
Dance          +20
Photography    +18
Budget         +20
Location       +18
Available time +18
```

**XPBar** — segmented horizontal progress bar to next level, `accent-lime`
fill, Geist Mono for the `2,840 / 3,500` label.

**AvatarStack** — overlapping circular avatars for quest room participants,
`+N` overflow badge past 4.

**CategoryChip** — pill, icon + i18n label, selected state uses `accent-
blue` fill; used in discovery filters and quest creation.

**MapPin / cluster** — category-colored pin (MapLibre GL custom layer),
clustering into a count badge below a zoom threshold — never renders an
individual user's exact live location (see [SECURITY.md](SECURITY.md)).

**BottomSheet** — rounded top corners (`20px`), drag handle, used for quest
detail/join and filter panels — keeps discovery on one screen rather than
pushing a full-screen navigation stack for a quick look.

## Motion

Glow/highlight transitions on interactive states (`150ms ease-out`), sheet
presentation (`250ms spring`, subtle overshoot). No motion is purely
decorative — every animation communicates state change (joined, completed,
leveled up).

## Accessibility

All text/background pairs meet WCAG AA contrast in both themes (verified
against the hex values above). Accent colors are never the sole signal for
state — always paired with an icon or label (e.g. a checkmark, not just a
lime dot, for "completed").
