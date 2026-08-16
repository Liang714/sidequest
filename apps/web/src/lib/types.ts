// Small display-only vocabulary that isn't worth generating from the API
// schema (emoji/star lookups have no backend representation) — everything
// that *does* come from the backend lives in @sidequest/types instead.

export type Category =
  | "food"
  | "cafe"
  | "gaming"
  | "photography"
  | "dance"
  | "movies"
  | "art"
  | "sports"
  | "exploration"
  | "music"
  | "shopping"
  | "random";

export const categoryEmoji: Record<Category, string> = {
  food: "🍜",
  cafe: "☕",
  gaming: "🎮",
  photography: "📸",
  dance: "💃",
  movies: "🎬",
  art: "🎨",
  sports: "🏃",
  exploration: "🚶",
  music: "🎵",
  shopping: "🛍️",
  random: "🎲",
};

export type Difficulty = "easy" | "medium" | "hard" | "epic";
export const difficultyStars: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  epic: 4,
};

/** Still unused post-Phase-2 (no compatibility scoring until Phase 3) but
 * kept alive for components/compatibility-badge.tsx, which docs/DESIGN_SYSTEM.md
 * documents as a real future screen element, not dead code to delete. */
export interface CompatibilityBreakdownItem {
  labelKey: string;
  points: number;
}
