import type { Config } from "tailwindcss";
import { font, spacing, radius } from "@sidequest/design-tokens";

// Colors resolve through CSS custom properties (see src/app/globals.css) so
// the same utility classes (bg-bg, text-ink, ...) work for both prefers-
// color-scheme and the explicit next-themes toggle. Type scale, spacing and
// radius come straight from the shared tokens package — see
// docs/DESIGN_SYSTEM.md for the values and docs/ARCHITECTURE.md for why
// this file, not this repo, is the source of truth.
const config: Config = {
  // Theming runs entirely through the CSS custom properties above (media
  // query + [data-theme] override via next-themes) — no dark: variant
  // usage, so Tailwind's own darkMode mechanism stays at its default.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        line: "var(--line)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        blue: { DEFAULT: "var(--accent-blue)", soft: "var(--accent-blue-soft)" },
        lime: { DEFAULT: "var(--accent-lime)", soft: "var(--accent-lime-soft)" },
        violet: { DEFAULT: "var(--accent-violet)", soft: "var(--accent-violet-soft)" },
        coral: { DEFAULT: "var(--accent-coral)", soft: "var(--accent-coral-soft)" },
      },
      fontFamily: {
        // next/font/local hashes the actual family name into a CSS
        // variable (set on <html> in layout.tsx) — the token package's
        // ["Geist", ...] names stay the documented intent, but the
        // variable is what the browser actually resolves. Same fallback
        // chain either way.
        display: ["var(--font-geist-sans)", ...font.display.slice(1)],
        body: [...font.body],
        mono: ["var(--font-geist-mono)", ...font.mono.slice(1)],
      },
      spacing,
      borderRadius: {
        card: radius.card,
        button: radius.button,
        chip: radius.chip,
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "glow-blue": "var(--glow-blue)",
        "glow-lime": "var(--glow-lime)",
      },
    },
  },
  plugins: [],
};

export default config;
