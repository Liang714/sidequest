/**
 * Friendly aliases over the generated OpenAPI types (api.ts) — regenerate
 * that file with `pnpm generate` (needs the API running at localhost:8000)
 * whenever services/api's schemas change; this file's aliases stay stable
 * unless a schema is renamed.
 */
import type { components } from "./api";

export type Schemas = components["schemas"];

export type TokenPair = Schemas["TokenPair"];
export type MeOut = Schemas["MeOut"];
export type ProfileOut = Schemas["ProfileOut"];
export type InterestOut = Schemas["InterestOut"];

export type LocationOut = Schemas["LocationOut"];
export type ObjectiveOut = Schemas["ObjectiveOut"];
export type ParticipantOut = Schemas["ParticipantOut"];
export type QuestOut = Schemas["QuestOut"];
export type QuestSummaryOut = Schemas["QuestSummaryOut"];
export type QuestCompleteOut = Schemas["QuestCompleteOut"];

export type FriendOut = Schemas["FriendOut"];
export type MessageOut = Schemas["MessageOut"];
export type NotificationOut = Schemas["NotificationOut"];
export type XpSummaryOut = Schemas["XpSummaryOut"];
export type AchievementOut = Schemas["AchievementOut"];

export type QuestDifficulty = QuestOut["difficulty"];
export type QuestStatus = QuestOut["status"];
export type QuestVisibility = QuestOut["visibility"];

export type CompatibilityOut = Schemas["CompatibilityOut"];
export type CompatibilityBreakdownOut = Schemas["CompatibilityBreakdownOut"];
export type GeneratedQuestOut = Schemas["GeneratedQuestOut"];
