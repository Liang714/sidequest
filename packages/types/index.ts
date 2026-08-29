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

export type SponsorInfoOut = Schemas["SponsorInfoOut"];
export type BusinessOut = Schemas["BusinessOut"];
export type SponsoredQuestOut = Schemas["SponsoredQuestOut"];
export type BusinessAnalyticsOut = Schemas["BusinessAnalyticsOut"];
export type QuestAnalyticsOut = Schemas["QuestAnalyticsOut"];
export type BusinessVerificationStatus = BusinessOut["verification_status"];
export type SponsorshipType = SponsorInfoOut["sponsorship_type"];

export type SubscriptionOut = Schemas["SubscriptionOut"];
export type SubscriptionPlan = SubscriptionOut["plan"];
export type AiQuotaOut = Schemas["AiQuotaOut"];
export type CreatorOut = Schemas["CreatorOut"];
export type CreatorQuestOut = Schemas["CreatorQuestOut"];
export type MarketplaceQuestOut = Schemas["MarketplaceQuestOut"];

export type AvailabilitySlotOut = Schemas["AvailabilitySlotOut"];
export type BookingOut = Schemas["BookingOut"];
export type BookingStatus = BookingOut["status"];

export type ItineraryPlanOut = Schemas["ItineraryPlanOut"];
export type PlanStepOut = Schemas["PlanStepOut"];
export type ExplainRecommendationOut = Schemas["ExplainRecommendationOut"];
export type VerifyPhotoOut = Schemas["VerifyPhotoOut"];
export type VisionVerificationOut = Schemas["VisionVerificationOut"];

export type ReportOut = Schemas["ReportOut"];

export type PublicProfileOut = Schemas["PublicProfileOut"];
export type ReportTargetType = Schemas["ReportTargetType"];
