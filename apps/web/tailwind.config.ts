import type { Config } from "tailwindcss";
import {
  font,
  spacing,
  radius,
  avatar,
  borderWidth,
  shadow,
  type,
  motion,
} from "@sidequest/design-tokens";

/**
 * BOLD POP — see docs/superpowers/specs/2026-10-03-bold-pop-design.md.
 *
 * Colors resolve through CSS custom properties (src/app/globals.css) so a
 * value changes in one place. Bold Pop is light-only — no `dark:` variants.
 *
 * The accent split matters: `bg-hot` is a FILL, `text-hot-text` is the
 * accessible TEXT variant (they are different hues — yellow fails as text at
 * 1.3:1). Pair a fill with its `text-on-*` counterpart.
 *
 * `border` is 2px by default (tokens.borderWidth) and `line` is black, so a
 * plain `border border-line` is already a Bold Pop outline.
 */

const t = (s: (typeof type)[keyof typeof type]) =>
  [s.size, { lineHeight: s.lineHeight, fontWeight: String(s.weight), letterSpacing: s.tracking }] as [
    string,
    { lineHeight: string; fontWeight: string; letterSpacing: string },
  ];

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

        // Raw brand fills, for decoration (stickers, confetti, blobs) where a
        // semantic role would be a lie. UI state should use the roles below.
        pop: {
          yellow: "var(--pop-yellow)",
          blue: "var(--pop-blue)",
          pink: "var(--pop-pink)",
        },

        // Semantic roles. DEFAULT = fill, `text` = accessible-as-text,
        // `soft` = pastel tint.
        hot: {
          DEFAULT: "var(--accent-hot)",
          text: "var(--accent-hot-text)",
          soft: "var(--accent-hot-soft)",
        },
        pink: {
          DEFAULT: "var(--accent-pink)",
          text: "var(--accent-pink-text)",
          soft: "var(--accent-pink-soft)",
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
        "on-pink": "var(--on-pink)",
        "on-info": "var(--on-info)",
        "on-warn": "var(--on-warn)",
        "on-danger": "var(--on-danger)",

        scrim: "var(--scrim)",

        // deprecated: pre-rebuild screens only — pointed at Bold Pop roles
        blue: { DEFAULT: "var(--accent-info-text)", soft: "var(--accent-info-soft)" },
        lime: { DEFAULT: "var(--accent-pink-text)", soft: "var(--accent-pink-soft)" },
        violet: { DEFAULT: "var(--accent-info-text)", soft: "var(--accent-info-soft)" },
        coral: { DEFAULT: "var(--accent-danger-text)", soft: "var(--accent-danger-soft)" },
      },
      fontFamily: {
        // next/font/local hashes the real family name into a CSS variable
        // (set on <html> in layout.tsx); the token package's names stay the
        // documented intent while the variable is what the browser resolves.
        display: ["var(--font-space-grotesk)", ...font.display.slice(1)],
        body: ["var(--font-space-grotesk)", ...font.body.slice(1)],
        // Space Grotesk's figures are already distinctive and tabular-capable;
        // `font-mono` survives only so pre-rebuild call sites keep building.
        mono: ["var(--font-space-grotesk)", ...font.body.slice(1)],
      },
      fontSize: {
        hero: t(type.hero),
        display: t(type.display),
        h1: t(type.h1),
        h2: t(type.h2),
        h3: t(type.h3),
        body: t(type.body),
        "body-s": t(type.bodyS),
        caption: t(type.caption),
        label: t(type.label),
        numeric: t(type.numeric),
      },
      spacing: {
        ...spacing,
        // avatar sizes double as spacing values so face stacks can be laid
        // out without magic numbers — see the Rule of Faces.
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
      borderWidth: {
        DEFAULT: borderWidth.DEFAULT,
        thick: borderWidth.thick,
      },
      boxShadow: {
        e1: shadow.e1,
        e2: shadow.e2,
        e3: shadow.e3,
        "e-none": shadow.none,
        // deprecated aliases
        card: shadow.e1,
        "glow-blue": "none",
        "glow-lime": "none",
      },
      transitionTimingFunction: {
        snap: motion.easing.snap,
        pop: motion.easing.pop,
        exit: motion.easing.exit,
      },
      transitionDuration: {
        instant: motion.duration.instant,
        fast: motion.duration.fast,
        base: motion.duration.base,
        slow: motion.duration.slow,
      },
      keyframes: {
        // Sticker slapped onto the page: lands slightly rotated, overshoots, settles.
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.86) rotate(-2deg)" },
          "60%": { opacity: "1", transform: "scale(1.03) rotate(0.6deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0)" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "scrim-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Validation error: a short, hard horizontal shake.
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0)" },
          "25%": { transform: "rotate(-8deg)" },
          "75%": { transform: "rotate(8deg)" },
        },
        // Skeleton: diagonal stripes sliding, not a soft shimmer.
        stripes: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "28px 0" },
        },
        "check-draw": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        "count-bump": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pop-in": `pop-in ${motion.duration.slow} ${motion.easing.pop} both`,
        "rise-in": `rise-in ${motion.duration.slow} ${motion.easing.snap} both`,
        "sheet-up": `sheet-up ${motion.duration.base} ${motion.easing.snap} both`,
        "scrim-in": `scrim-in ${motion.duration.base} linear both`,
        shake: `shake 320ms ${motion.easing.press} both`,
        wiggle: `wiggle 400ms ${motion.easing.snap} both`,
        stripes: "stripes 700ms linear infinite",
        "check-draw": `check-draw ${motion.duration.base} ${motion.easing.snap} 120ms both`,
        "count-bump": `count-bump 300ms ${motion.easing.pop}`,
        "spin-slow": "spin-slow 12s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
