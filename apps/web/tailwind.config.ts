import type { Config } from "tailwindcss";
import { font, spacing, radius, avatar } from "@sidequest/design-tokens";

/**
 * CREW — see docs/superpowers/specs/2026-08-27-crew-ui-design.md §H.
 *
 * Colors resolve through CSS custom properties (src/app/globals.css) so the
 * same utility classes work for both prefers-color-scheme and the explicit
 * next-themes toggle — no `dark:` variants anywhere, so Tailwind's own
 * darkMode mechanism stays at its default.
 *
 * The accent split matters: `bg-hot` is a FILL, `text-hot` is the accessible
 * TEXT variant (they differ on light, where the fill is 3.1:1 and fails).
 * Pair a fill with its `text-on-hot` counterpart — white on hot is 2.5:1.
 */
const config: Config = {
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

        // CREW accents. DEFAULT = fill, `text` = accessible-as-text,
        // `on` = what to put on top of the fill, `soft` = tint.
        hot: {
          DEFAULT: "var(--accent-hot)",
          text: "var(--accent-hot-text)",
          soft: "var(--accent-hot-soft)",
        },
        mint: {
          DEFAULT: "var(--accent-mint)",
          text: "var(--accent-mint-text)",
          soft: "var(--accent-mint-soft)",
        },
        info: {
          DEFAULT: "var(--accent-info)",
          text: "var(--accent-info-text)",
          soft: "var(--accent-info-soft)",
        },
        warn: {
          DEFAULT: "var(--accent-warn)",
          text: "var(--accent-warn-text)",
          soft: "var(--accent-warn-soft)",
        },
        danger: {
          DEFAULT: "var(--accent-danger)",
          text: "var(--accent-danger-text)",
          soft: "var(--accent-danger-soft)",
        },

        // text-on-fill pairings
        "on-hot": "var(--on-hot)",
        "on-mint": "var(--on-mint)",
        "on-info": "var(--on-info)",
        "on-warn": "var(--on-warn)",
        "on-danger": "var(--on-danger)",

        scrim: "var(--scrim)",

        // deprecated: pre-rebuild screens only, removed at stage 7
        blue: { DEFAULT: "var(--accent-blue)", soft: "var(--accent-blue-soft)" },
        lime: { DEFAULT: "var(--accent-lime)", soft: "var(--accent-lime-soft)" },
        violet: { DEFAULT: "var(--accent-violet)", soft: "var(--accent-violet-soft)" },
        coral: { DEFAULT: "var(--accent-coral)", soft: "var(--accent-coral-soft)" },
      },
      fontFamily: {
        // next/font/local hashes the real family name into a CSS variable
        // (set on <html> in layout.tsx); the token package's names stay the
        // documented intent while the variable is what the browser resolves.
        display: ["var(--font-figtree)", ...font.display.slice(1)],
        body: ["var(--font-figtree)", ...font.body.slice(1)],
        mono: ["var(--font-geist-mono)", ...font.mono.slice(1)],
      },
      fontSize: {
        // CREW type scale — see tokens.ts `type`. Sentence case throughout;
        // `label` is the only style that is ever uppercased.
        display: ["30px", { lineHeight: "1.12", fontWeight: "800", letterSpacing: "-0.025em" }],
        h1: ["27px", { lineHeight: "1.14", fontWeight: "800", letterSpacing: "-0.022em" }],
        h2: ["21px", { lineHeight: "1.25", fontWeight: "800", letterSpacing: "-0.02em" }],
        h3: ["17px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-s": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12.5px", { lineHeight: "1.4", fontWeight: "500" }],
        label: ["11px", { lineHeight: "1.25", fontWeight: "700", letterSpacing: "0.06em" }],
        numeric: ["14px", { lineHeight: "1.2", fontWeight: "700" }],
      },
      spacing: {
        ...spacing,
        // avatar sizes double as spacing values so face stacks can be laid
        // out without magic numbers — see the Rule of Faces (spec §H).
        "av-xs": avatar.xs,
        "av-sm": avatar.sm,
        "av-md": avatar.md,
        "av-lg": avatar.lg,
      },
      borderRadius: {
        card: radius.card,
        button: radius.button,
        input: radius.input,
        bubble: radius.bubble,
        sheet: radius.sheet,
        chip: radius.chip,
        pill: radius.pill,
      },
      boxShadow: {
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)",
        e3: "var(--shadow-e3)",
        // deprecated aliases
        card: "var(--shadow-card)",
        "glow-blue": "none",
        "glow-lime": "none",
      },
      transitionTimingFunction: {
        crew: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
