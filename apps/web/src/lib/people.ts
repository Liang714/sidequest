/**
 * Helpers that encode CREW product rules in code, so they can't be bypassed
 * by a careless call site. See docs/superpowers/specs/2026-08-27-crew-ui-design.md.
 */

export type DistanceBand = "under1" | "1to3" | "3to5" | "over5";

/**
 * People are shown a distance BAND, never a precise figure.
 *
 * Spec §L principle 5 ("Coarse is enough") and §G: a band is enough to
 * decide whether to meet someone; a precise distance, sampled a few times,
 * is enough to locate them. This function is the only sanctioned way to
 * render how far away a *person* is.
 *
 * Quests are different and deliberately so — a quest has a public meeting
 * point, so crew cards show a real distance ("1.2km").
 */
export function distanceBand(km: number): DistanceBand {
  if (km < 1) return "under1";
  if (km < 3) return "1to3";
  if (km < 5) return "3to5";
  return "over5";
}

/** English labels. Product screens resolve these through next-intl instead. */
const BAND_LABEL: Record<DistanceBand, string> = {
  under1: "under 1km",
  "1to3": "1–3km",
  "3to5": "3–5km",
  over5: "over 5km",
};

export function distanceBandLabel(km: number): string {
  return BAND_LABEL[distanceBand(km)];
}

/**
 * "Minji, Tae & Sora" — locale-aware via Intl.ListFormat, so Korean and
 * Japanese get their own conjunctions rather than a hardcoded " & ".
 *
 * Past `max`, the tail collapses ("Minji, Tae & 3 others") — a crew card
 * headline that wraps to three lines stops being a headline.
 */
export function joinNames(names: string[], locale = "en", max = 3): string {
  const fmt = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  if (names.length <= max) return fmt.format(names);
  const shown = names.slice(0, max - 1);
  const rest = names.length - shown.length;
  return fmt.format([...shown, `${rest} others`]);
}
