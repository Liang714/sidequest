# packages/i18n

`ko.json`, `en.json`, `ja.json`, `zh.json` resource files. No UI string is
ever hardcoded in `apps/web` or `apps/mobile` application code — every
string resolves from here via next-intl (web) / i18next (mobile). See
[../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §Internationalization.

Empty on purpose in Phase 0 — populated alongside the first onboarding/home
screens in Phase 1/2.
