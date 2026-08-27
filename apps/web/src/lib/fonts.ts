import localFont from "next/font/local";

// Self-hosted (no font CDN request) — see docs/DESIGN_SYSTEM.md.

/**
 * CREW's display + UI face. Warm geometric humanist, variable 400–800.
 * Two files split by unicode-range exactly as Google Fonts serves them, so
 * the 10KB latin-ext slice only downloads when a page actually needs it.
 * Total for the common case: ~20KB.
 */
export const figtree = localFont({
  src: [
    {
      path: "../fonts/Figtree-Variable.woff2",
      weight: "400 800",
      style: "normal",
    },
    {
      path: "../fonts/Figtree-Variable-LatinExt.woff2",
      weight: "400 800",
      style: "normal",
    },
  ],
  variable: "--font-figtree",
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "Noto Sans KR",
    "sans-serif",
  ],
});

/**
 * Retained only for screens not yet migrated to CREW (they use `font-mono`
 * for tabular figures). CREW gets tabular figures from Figtree via
 * `tabular-nums`, so this goes away with stage 7.
 * @deprecated
 */
export const geistMono = localFont({
  src: [
    { path: "../fonts/GeistMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeistMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
