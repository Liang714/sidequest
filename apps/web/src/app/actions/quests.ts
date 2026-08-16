"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { AchievementOut, QuestCompleteOut, QuestOut } from "@sidequest/types";

export interface QuestActionResult {
  quest?: QuestOut;
  error?: string;
}

async function callQuestAction(path: string, method: "POST" | "DELETE" = "POST"): Promise<QuestActionResult> {
  try {
    const quest = await apiFetch<QuestOut>(path, { method });
    revalidatePath("/", "layout");
    return { quest };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function joinQuestAction(questId: string): Promise<QuestActionResult> {
  return callQuestAction(`/quests/${questId}/join`);
}
export async function leaveQuestAction(questId: string): Promise<QuestActionResult> {
  return callQuestAction(`/quests/${questId}/leave`);
}
export async function checkinQuestAction(questId: string): Promise<QuestActionResult> {
  return callQuestAction(`/quests/${questId}/checkin`);
}

export interface CompleteQuestActionResult {
  quest?: QuestOut;
  xpAwarded?: number;
  newLevel?: number | null;
  newAchievements?: AchievementOut[];
  error?: string;
}

export async function completeQuestAction(questId: string): Promise<CompleteQuestActionResult> {
  try {
    const result = await apiFetch<QuestCompleteOut>(`/quests/${questId}/complete`, { method: "POST" });
    revalidatePath("/", "layout");
    return {
      quest: result.quest,
      xpAwarded: result.xp_awarded,
      newLevel: result.new_level,
      newAchievements: result.new_achievements,
    };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function completeObjectiveAction(
  questId: string,
  objectiveId: string,
): Promise<QuestActionResult> {
  return callQuestAction(`/quests/${questId}/objectives/${objectiveId}/complete`);
}

export interface CreateQuestInput {
  title: string;
  description: string;
  category_key: string;
  location: { lat: number; lng: number; city: string; country?: string; place_name?: string };
  start_time: string;
  duration_minutes: number;
  budget_amount?: number | null;
  currency?: string;
  max_participants: number;
  difficulty: string;
  visibility?: string;
  xp_reward: number;
  objectives: { description: string; verification_type?: string; is_required?: boolean }[];
}

export async function createQuestAction(input: CreateQuestInput): Promise<QuestActionResult> {
  try {
    const quest = await apiFetch<QuestOut>("/quests", { method: "POST", body: input });
    revalidatePath("/", "layout");
    return { quest };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
