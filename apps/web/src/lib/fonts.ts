import localFont from "next/font/local";

// Self-hosted (no font CDN request) — see docs/DESIGN_SYSTEM.md.

/**
 * Bold Pop's display + UI face. Space Grotesk, variable 400–700 — quirky
 * geometric grotesk whose odd terminals carry the brand at bold weights.
 *
 * Two slices as Google Fonts serves them. Same-descriptor faces form one
 * composite face and the browser tries the LAST-declared first, so latin
 * goes last: the 19KB latin-ext slice is only fetched when a page contains
 * a glyph the 22KB latin slice lacks.
 *
 * No Hangul — Korean falls through per-glyph to the system stack below.
 */
export const spaceGrotesk = localFont({
  src: [
    {
      path: "../fonts/SpaceGrotesk-Variable-LatinExt.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "../fonts/SpaceGrotesk-Variable.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-space-grotesk",
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
