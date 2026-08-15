// Prototype-only shapes — a deliberately trimmed mirror of docs/DATABASE.md,
// just enough to drive the Phase 1 screens off mock data. Real types get
// generated from the FastAPI OpenAPI schema into packages/types in Phase 2
// (see docs/ARCHITECTURE.md) — this file does not try to anticipate that.

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

export type QuestVisibility = "public" | "friends" | "private";
export type QuestStatus = "open" | "full" | "in_progress" | "completed" | "cancelled";

export interface QuestUser {
  id: string;
  username: string;
  avatarInitial: string;
  avatarColor: "blue" | "violet" | "coral" | "lime";
  level: number;
}

export interface QuestObjective {
  id: string;
  label: string;
  completed: boolean;
}

export interface CompatibilityBreakdownItem {
  labelKey: string;
  points: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  startLabel: string;
  startsInMinutes?: number;
  budgetLabel: string;
  maxParticipants: number;
  joinedParticipants: QuestUser[];
  difficulty: Difficulty;
  xpReward: number;
  visibility: QuestVisibility;
  status: QuestStatus;
  compatibility?: number;
  compatibilityBreakdown?: CompatibilityBreakdownItem[];
  objectives: QuestObjective[];
  meetingPoint: string;
  host: QuestUser;
  gradient: string;
  mapPosition: { x: number; y: number };
  sponsored?: { businessName: string };
}

export interface Achievement {
  id: string;
  emoji: string;
  labelKey: string;
}

export interface ChatMessage {
  id: string;
  sender: QuestUser;
  content: string;
  timeLabel: string;
}
