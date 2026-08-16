import type { Category } from "./types";

/** "category.gaming" -> "gaming" — strips the i18n-key namespace the
 * backend stores (see docs/ARCHITECTURE.md §Internationalization: these
 * columns are keys, never display text) so the existing category emoji/
 * label lookups (keyed by the short form) keep working against real data. */
export function categoryShortKey(categoryKey: string): Category {
  return categoryKey.replace(/^category\./, "") as Category;
}

const GRADIENTS: Record<string, string> = {
  food: "linear-gradient(135deg, #ef8f3d, #b6883f)",
  cafe: "linear-gradient(135deg, #b6883f, #d1466b)",
  gaming: "linear-gradient(135deg, #2d6fd1, #6b3fd4)",
  photography: "linear-gradient(135deg, #178a7a, #2d6fd1)",
  dance: "linear-gradient(135deg, #d1466b, #ef8f3d)",
  movies: "linear-gradient(135deg, #6b3fd4, #2d6fd1)",
  art: "linear-gradient(135deg, #7c4fe0, #d1466b)",
  sports: "linear-gradient(135deg, #178a7a, #7fbf00)",
  exploration: "linear-gradient(135deg, #2d6fd1, #178a7a)",
  music: "linear-gradient(135deg, #d1466b, #7c4fe0)",
  shopping: "linear-gradient(135deg, #ef8f3d, #d1466b)",
  random: "linear-gradient(135deg, #7c4fe0, #2d6fd1)",
};

export function gradientForCategory(categoryKey: string): string {
  return GRADIENTS[categoryShortKey(categoryKey)] ?? (GRADIENTS.random as string);
}

const AVATAR_COLORS = ["blue", "violet", "coral", "lime"] as const;

/** Deterministic color from a user id — same idea as an avatar generator,
 * no state needed since it's a pure function of the id. */
export function avatarColorFor(userId: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as (typeof AVATAR_COLORS)[number];
}

export function formatBudget(
  amount: string | number | null | undefined,
  currency: string,
  freeLabel: string,
): string {
  const n = amount === null || amount === undefined ? null : Number(amount);
  if (!n) return freeLabel;
  const formatted = new Intl.NumberFormat("en-US").format(n);
  return currency === "KRW" ? `₩${formatted}` : `${formatted} ${currency}`;
}

/** "Starts in 45 min" inside a 3-hour window either side of now, otherwise
 * a localized clock time — mirrors the Phase 1 prototype's mock startLabel
 * field, now computed from a real ISO timestamp. */
export function formatStartLabel(startTimeIso: string, locale: string, soonLabel: (mins: number) => string): string {
  const start = new Date(startTimeIso);
  const diffMs = start.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin > 0 && diffMin <= 180) return soonLabel(diffMin);
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(start);
}

export function isStartingSoon(startTimeIso: string): boolean {
  const diffMs = new Date(startTimeIso).getTime() - Date.now();
  return diffMs > -30 * 60 * 1000 && diffMs <= 3 * 60 * 60 * 1000;
}

/** A plain calendar date ("Aug 20, 2026") — unlike formatStartLabel, this
 * never collapses to "starts in Xmin"/a bare clock time, which reads fine
 * for an upcoming quest but is ambiguous for a quest completed months ago
 * (see profile.questHistory). */
export function formatQuestDate(startTimeIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(startTimeIso));
}

export function initialFromUsername(username: string): string {
  return username.charAt(0).toUpperCase();
}
