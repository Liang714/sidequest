"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Stamps data-theme="dark" | "light" on <html> (attribute="data-theme"),
 * matching the [data-theme] selectors in globals.css. Defaults to the OS
 * preference (defaultTheme="system") rather than forcing dark, per
 * docs/DESIGN_SYSTEM.md — dark-first in *feel*, not a forced-dark app.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
