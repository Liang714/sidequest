import { defineRouting } from "next-intl/routing";

// Korean, English, Japanese, Chinese are the architecture's committed locale
// set (docs/ARCHITECTURE.md §Internationalization). Only en/ko ship content
// in Phase 1 — ja/zh get added here once real copy exists, not before,
// so nothing sits half-translated in production.
export const routing = defineRouting({
  locales: ["en", "ko"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
