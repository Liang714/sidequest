import type { Metadata } from "next";
import type { ReactNode } from "react";
import { spaceGrotesk } from "@/lib/fonts";
import "../globals.css";

/**
 * Root layout for developer surfaces (/dev/*).
 *
 * These live outside the [locale] segment — they're tooling, not product —
 * so they need their own root layout with <html>/<body>. Deliberately no
 * next-intl provider: the kitchen sink renders primitives with literal
 * strings so the design system can be reviewed without the API running.
 */
export const metadata: Metadata = {
  title: "Bold Pop kitchen sink — SIDEQUEST",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
