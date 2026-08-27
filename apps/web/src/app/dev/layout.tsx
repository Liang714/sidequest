import type { Metadata } from "next";
import type { ReactNode } from "react";
import { figtree, geistMono } from "@/lib/fonts";
import "../globals.css";

/**
 * Root layout for developer surfaces (/dev/*).
 *
 * These live outside the [locale] segment — they're tooling, not product —
 * so they need their own root layout with <html>/<body>. Deliberately no
 * next-intl provider and no ThemeProvider: the kitchen sink drives
 * data-theme on a wrapper so both themes can be compared side by side
 * without touching the user's app-wide theme preference.
 */
export const metadata: Metadata = {
  title: "CREW kitchen sink — SIDEQUEST",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
