import localFont from "next/font/local";

// Self-hosted (no font CDN request) — see docs/DESIGN_SYSTEM.md.
// Geist Sans carries headings/identity; Geist Mono carries anything with
// digits that need to line up (XP, prices, times, countdowns).
export const geistSans = localFont({
  src: [
    { path: "../fonts/Geist-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Geist-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Geist-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Geist-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: [
    { path: "../fonts/GeistMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeistMono-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
