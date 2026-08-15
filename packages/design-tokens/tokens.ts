/**
 * SIDEQUEST design tokens — single source of truth.
 *
 * Consumed today by apps/web's Tailwind config (JS config, Tailwind v3.4 —
 * pinned specifically so this file can be reused as-is by NativeWind v4 in
 * apps/mobile once Phase 2 scaffolds it; Tailwind v4's CSS-native config
 * would fork that single-source story). See docs/ARCHITECTURE.md and
 * docs/DESIGN_SYSTEM.md for the full rationale and the color table.
 */

export const color = {
  dark: {
    bg: "#0B0B0F",
    surface: "#16161D",
    surfaceElevated: "#1D1D26",
    border: "#2A2A35",
    ink: "#F5F5F7",
    inkMuted: "#9C9CA8",
    inkFaint: "#6B6B76",
  },
  light: {
    bg: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceElevated: "#F1F1F5",
    border: "#E4E4EA",
    ink: "#14141B",
    inkMuted: "#6B6B76",
    inkFaint: "#9A9AA4",
  },
  accent: {
    blue: { dark: "#4C6FFF", light: "#3854E0" }, // primary CTAs, links, focus
    lime: { dark: "#B4FF39", light: "#7FBF00" }, // XP, completion, success
    violet: { dark: "#9D6BFF", light: "#7C4FE0" }, // premium / creator
    coral: { dark: "#FF6B5B", light: "#E0473A" }, // destructive / caution
  },
} as const;

export const font = {
  display: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
  body: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
  mono: ["Geist Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
} as const;

export const radius = {
  card: "20px",
  button: "12px",
  chip: "999px",
} as const;

export const difficulty = {
  easy: { labelKey: "difficulty.easy", stars: 1 },
  medium: { labelKey: "difficulty.medium", stars: 2 },
  hard: { labelKey: "difficulty.hard", stars: 3 },
  epic: { labelKey: "difficulty.epic", stars: 4 },
} as const;
