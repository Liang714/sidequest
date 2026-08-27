/**
 * SIDEQUEST design tokens — single source of truth.
 *
 * Design language: CREW (warm, social, people-first).
 * See docs/superpowers/specs/2026-08-27-crew-ui-design.md §H for the full
 * system and the computed contrast table behind every accent decision.
 *
 * Consumed today by apps/web's Tailwind config (JS config, Tailwind v3.4 —
 * pinned specifically so this file can be reused as-is by NativeWind v4 in
 * apps/mobile once it's scaffolded; Tailwind v4's CSS-native config would
 * fork that single-source story). See docs/ARCHITECTURE.md.
 *
 * MIGRATION NOTE: the CREW rebuild is staged (spec §Implementation shape).
 * The neutral ramp (bg/surface/line/ink) is already re-pointed to CREW's
 * warm values, so every existing screen warms up immediately with no code
 * change. The legacy accent names (blue/lime/violet/coral) are kept as
 * deprecated aliases onto their CREW equivalents so pre-rebuild screens keep
 * building; they are removed once stage 7 finishes migrating screens.
 */

export const color = {
  /** Warm charcoal, never neutral black — the warmth is the point. */
  dark: {
    bg: "#12100E",
    surface: "#1C1916",
    surfaceElevated: "#241F1B",
    border: "#332C26",
    ink: "#FBF7F2", // warm cream, not white — 16.4:1
    inkMuted: "#A79E96", // 7.2:1
    // 4.9:1. Lightened from #726A63, which measured 3.58:1 in the browser and
    // failed AA — ink-faint carries section labels and timestamps, which are
    // content, not decoration, so 3:1 "large text" leniency doesn't apply
    // (labels render at 11px).
    inkFaint: "#8A8178",
  },
  light: {
    bg: "#FDFBF7",
    surface: "#FFFFFF",
    surfaceElevated: "#F5F0E9",
    border: "#E5DDD2",
    ink: "#12100E", // 19.0:1
    inkMuted: "#6B6259", // 5.8:1
    inkFaint: "#797067", // 4.7:1 — darkened from #938A81, which was 3.28:1
  },

  /**
   * CREW accents. Each has exactly one job:
   *   hot    — primary action / energy
   *   mint   — friend / confirmed / arrived / earned
   *   info   — AI surfaces, links, compatibility
   *   warn   — sponsored, pending
   *   danger — destructive
   *
   * `fill` is the background value; `text` is the value to use when the
   * accent is TEXT on that theme's background. They differ on light because
   * both hot (3.1:1) and mint (1.6:1) fail WCAG AA as text on #FDFBF7.
   * Never use `fill` as a text color on light. See spec §H.
   */
  accent: {
    hot: {
      dark: { fill: "#FF6A3D", text: "#FF6A3D", on: "#12100E" }, // text 6.7:1 on dark
      light: { fill: "#FF6A3D", text: "#C2410C", on: "#12100E" }, // text 5.1:1 on light
    },
    mint: {
      dark: { fill: "#7BE0A4", text: "#7BE0A4", on: "#12100E" }, // text 11.9:1 on dark
      light: { fill: "#7BE0A4", text: "#17714A", on: "#12100E" }, // text 5.8:1 on light
    },
    info: {
      dark: { fill: "#8AA6FF", text: "#8AA6FF", on: "#12100E" },
      light: { fill: "#3355D4", text: "#3355D4", on: "#FFFFFF" },
    },
    warn: {
      dark: { fill: "#F5C36B", text: "#F5C36B", on: "#12100E" },
      light: { fill: "#F5C36B", text: "#8A5A00", on: "#12100E" },
    },
    danger: {
      dark: { fill: "#FF6B5B", text: "#FF6B5B", on: "#12100E" },
      light: { fill: "#C7362A", text: "#C7362A", on: "#FFFFFF" },
    },
  },
} as const;

/**
 * Text-on-fill pairing, stated explicitly so it can't be got wrong.
 * White on #FF6A3D is 2.5:1 and FAILS — primary buttons are tangerine fill
 * with near-black ink (6.7:1). See spec §H "Catch 1".
 */
export const onAccent = {
  hot: "#12100E",
  mint: "#12100E",
  warn: "#12100E",
  info: { dark: "#12100E", light: "#FFFFFF" },
  danger: { dark: "#12100E", light: "#FFFFFF" },
} as const;

export const font = {
  /** Warm geometric humanist. Display + UI. Sentence case, never uppercase headlines. */
  display: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
  /**
   * Body. Figtree first for Latin, then a Korean-capable system stack.
   *
   * Pretendard is the spec's preferred face for Hangul, but its variable
   * build is 2.0MB — unacceptable to ship on a mobile-first product whose
   * primary market is on Korean mobile networks. The system stack below
   * resolves to Apple SD Gothic Neo / Malgun Gothic on Korean devices,
   * which are genuinely good and cost 0 bytes. Revisit with Pretendard's
   * dynamic unicode-range subset (~150 small files) if Hangul rendering
   * proves inconsistent in practice. See spec §H.
   */
  body: [
    "Figtree",
    "-apple-system",
    "BlinkMacSystemFont",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Noto Sans KR",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
  /** Retained for pre-rebuild screens; CREW uses tabular-nums on Figtree instead. */
  mono: ["Geist Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
} as const;

/** 4px base. Only these five vertical gaps appear in CREW: 8 12 16 24 40. */
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

/** CREW is rounder than the pre-rebuild system. Six values, no exceptions. */
export const radius = {
  card: "22px",
  button: "16px",
  input: "14px",
  bubble: "16px",
  sheet: "28px",
  chip: "999px",
  pill: "999px",
} as const;

/**
 * Type scale. Sentence case throughout; uppercase is reserved for the
 * `label` style only. Line-heights run deliberately looser than a
 * urgency-led system — this is most of what makes CREW read as warm.
 */
export const type = {
  display: { size: "30px", lineHeight: "1.12", weight: 800, tracking: "-0.025em" },
  h1: { size: "27px", lineHeight: "1.14", weight: 800, tracking: "-0.022em" },
  h2: { size: "21px", lineHeight: "1.25", weight: 800, tracking: "-0.02em" },
  h3: { size: "17px", lineHeight: "1.35", weight: 700, tracking: "-0.01em" },
  body: { size: "16px", lineHeight: "1.55", weight: 400, tracking: "0" },
  bodyS: { size: "14px", lineHeight: "1.5", weight: 400, tracking: "0" },
  caption: { size: "12.5px", lineHeight: "1.4", weight: 500, tracking: "0" },
  label: { size: "11px", lineHeight: "1.25", weight: 700, tracking: "0.06em" },
  numeric: { size: "14px", lineHeight: "1.2", weight: 700, tracking: "0" },
} as const;

/**
 * Avatar sizes are load-bearing, not decorative — they encode the Rule of
 * Faces (spec §H). 46px overlapping stacks appear ONLY on crew cards, where
 * people have already co-committed to a public plan. Browsable individuals
 * get a 32px non-overlapping avatar and lead with interests instead. There
 * is no face grid anywhere in the product.
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
