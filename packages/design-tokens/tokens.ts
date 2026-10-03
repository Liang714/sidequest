/**
 * SIDEQUEST design tokens — single source of truth.
 *
 * Design language: BOLD POP (neo-brutalist — loud, quirky, memorable).
 * See docs/superpowers/specs/2026-10-03-bold-pop-design.md for the full
 * system, the motion spec, and the computed contrast table behind every
 * colour pairing below.
 *
 * Consumed today by apps/web's Tailwind config (JS config, Tailwind v3.4 —
 * pinned specifically so this file can be reused as-is by NativeWind v4 in
 * apps/mobile once it's scaffolded; Tailwind v4's CSS-native config would
 * fork that single-source story). See docs/ARCHITECTURE.md.
 *
 * Bold Pop is light-only. The three brand fills (yellow, blue, pink) are
 * designed against a white/cream canvas with black outlines, and a dark
 * variant would have to invert the outlines — at which point it's a
 * different style. Spec §1.4.
 */

/** The five brand values, exactly as briefed. Everything else derives from these. */
export const brand = {
  yellow: "#FFE14D",
  blue: "#3B5BFF",
  pink: "#FF8FB1",
  black: "#000000",
  white: "#FFFFFF",
} as const;

export const color = {
  /** Cream canvas (a 9% yellow tint) so white cards visibly sit ON something. */
  bg: "#FFFBEA",
  surface: "#FFFFFF",
  /** Sheets, neutral chips, skeletons, disabled fills. */
  surfaceElevated: "#F4F0E2",
  /** Every outline. Hairlines don't exist in Bold Pop — borders are 2px black. */
  line: "#000000",
  ink: "#000000", // 19.6:1 on bg
  inkMuted: "#404040", // 9.9:1 on bg
  inkFaint: "#5C5C5C", // 6.4:1 on bg — still AA at 11px label size

  /**
   * Semantic roles. Each has exactly one job:
   *   hot    — primary action / energy            → brand yellow
   *   info   — AI surfaces, links, secondary CTA  → brand blue
   *   pink   — friend / confirmed / arrived / earned → brand pink
   *   warn   — sponsored, pending                 → derived orange
   *   danger — destructive, errors                → derived red
   *
   * `fill` is the background value; `text` is the value to use when the
   * role is TEXT on the canvas; `on` is text placed ON the fill; `soft` is
   * a pastel tint for chips and asides.
   *
   * Yellow and pink fail as text on light (1.3:1 and 2.1:1), so their
   * `text` values are a different colour entirely. Never use `fill` as text.
   */
  accent: {
    hot: { fill: brand.yellow, text: "#2A44D6", on: "#000000", soft: "#FFF3B0" }, // on 16.1:1; links read blue
    info: { fill: brand.blue, text: "#2A44D6", on: "#FFFFFF", soft: "#DDE3FF" }, // on 5.1:1; text 6.8:1
    pink: { fill: brand.pink, text: "#A3134C", on: "#000000", soft: "#FFE0EA" }, // on 9.8:1; text 7.1:1
    warn: { fill: "#FF9F43", text: "#9A4A00", on: "#000000", soft: "#FFE4CC" }, // on 10.3:1; text 5.8:1
    danger: { fill: "#FF5A5A", text: "#B71C1C", on: "#000000", soft: "#FFDCDC" }, // on 6.9:1; text 6.1:1
  },
} as const;

export const font = {
  /** Display + UI. Space Grotesk 400–700, self-hosted. */
  display: ["Space Grotesk", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "sans-serif"],
  /**
   * Space Grotesk has no Hangul, so Korean falls through per-glyph to the
   * platform's Korean face (Apple SD Gothic Neo / Malgun Gothic) at the same
   * weight. That costs 0 bytes; Pretendard's variable build is 2.0MB, which
   * is unacceptable on a mobile-first product for Korean mobile networks.
   */
  body: [
    "Space Grotesk",
    "-apple-system",
    "BlinkMacSystemFont",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Noto Sans KR",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
} as const;

/** 4px base. Vertical rhythm uses only 8 12 16 24 40. */
export const spacing = {
  0.5: "2px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

/** Chunky-friendly, not pill-soft. Six values, no exceptions. */
export const radius = {
  card: "18px",
  button: "14px",
  input: "12px",
  bubble: "16px",
  sheet: "24px",
  chip: "999px",
  pill: "999px",
} as const;

/** Outlines. `DEFAULT` replaces Tailwind's 1px so every `border` is on-brand. */
export const borderWidth = {
  DEFAULT: "2px",
  thick: "3px",
} as const;

/**
 * Hard-edge, zero-blur, black offset shadows — the signature of the style.
 * Pressing an element removes its shadow and translates it by the same
 * offset, so it looks physically pushed into the page.
 */
export const shadow = {
  e1: "3px 3px 0 0 #000000",
  e2: "5px 5px 0 0 #000000",
  e3: "8px 8px 0 0 #000000",
  none: "0 0 0 0 #000000",
} as const;

/**
 * Type scale. Sentence case throughout; uppercase is reserved for `label`.
 * Tight leading and negative tracking on display sizes — Bold Pop headlines
 * are dense blocks, not airy lines. Hangul ignores tracking (globals.css).
 */
export const type = {
  hero: { size: "56px", lineHeight: "0.98", weight: 700, tracking: "-0.04em" }, // web ≥768px only
  display: { size: "34px", lineHeight: "1.04", weight: 700, tracking: "-0.035em" },
  h1: { size: "28px", lineHeight: "1.1", weight: 700, tracking: "-0.03em" },
  h2: { size: "22px", lineHeight: "1.2", weight: 700, tracking: "-0.02em" },
  h3: { size: "18px", lineHeight: "1.3", weight: 700, tracking: "-0.01em" },
  body: { size: "16px", lineHeight: "1.5", weight: 400, tracking: "0" },
  bodyS: { size: "14px", lineHeight: "1.45", weight: 400, tracking: "0" },
  caption: { size: "13px", lineHeight: "1.35", weight: 500, tracking: "0" },
  label: { size: "11.5px", lineHeight: "1.2", weight: 700, tracking: "0.08em" },
  numeric: { size: "14px", lineHeight: "1.2", weight: 700, tracking: "0" },
} as const;

/**
 * Motion. Snappy and near-linear for UI feedback; one overshoot curve kept
 * for "sticker" entrances only. Everything collapses to opacity-only (or
 * nothing) under prefers-reduced-motion. Spec §4.
 */
export const motion = {
  duration: {
    instant: "90ms", // press / shadow shift
    fast: "150ms", // hover, toggles, colour changes
    base: "250ms", // sheets, tab indicator, page transitions
    slow: "400ms", // pop-ins, reveals
    celebrate: "900ms", // confetti, level-up
  },
  easing: {
    /** Near-linear with a hard stop. The default for everything. */
    snap: "cubic-bezier(0.3, 0, 0.2, 1)",
    /** Overshoot — sticker pop-ins and badges ONLY. */
    pop: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    /** Exits accelerate away; they never ease out. */
    exit: "cubic-bezier(0.4, 0, 1, 1)",
    /** The press itself. A physical push has no curve. */
    press: "linear",
  },
  /** Delay between siblings in a staggered list. Capped at 8 items. */
  stagger: "40ms",
} as const;

/**
 * Avatar sizes are load-bearing, not decorative — they encode the Rule of
 * Faces (spec §2.6). 46px overlapping stacks appear ONLY on crew cards, where
 * people have already co-committed to a public plan. Browsable individuals
 * get a 32px non-overlapping avatar and lead with interests instead.
 */
export const avatar = {
  xs: "24px",
  sm: "32px", // person rows — browsable individuals
  md: "46px", // crew card face stacks only
  lg: "78px", // profile header
} as const;

export const difficulty = {
  easy: { labelKey: "difficulty.easy", stars: 1 },
  medium: { labelKey: "difficulty.medium", stars: 2 },
  hard: { labelKey: "difficulty.hard", stars: 3 },
  epic: { labelKey: "difficulty.epic", stars: 4 },
} as const;
