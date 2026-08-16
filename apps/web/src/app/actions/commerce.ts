"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { AiQuotaOut, CreatorOut, CreatorQuestOut, QuestOut, SubscriptionOut } from "@sidequest/types";

interface ActionResult<T> {
  data?: T;
  error?: string;
}

async function post<T>(path: string, body?: unknown): Promise<ActionResult<T>> {
  try {
    const data = await apiFetch<T>(path, { method: "POST", body });
    revalidatePath("/", "layout");
    return { data };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function subscribeAction(): Promise<ActionResult<SubscriptionOut>> {
  return post<SubscriptionOut>("/subscriptions/subscribe");
}

export async function cancelSubscriptionAction(): Promise<ActionResult<SubscriptionOut>> {
  return post<SubscriptionOut>("/subscriptions/cancel");
}

export async function purchaseAiCreditsAction(): Promise<ActionResult<AiQuotaOut>> {
  return post<AiQuotaOut>("/ai/credits/purchase");
}

export async function becomeCreatorAction(displayName: string): Promise<ActionResult<CreatorOut>> {
  return post<CreatorOut>("/creators", { display_name: displayName });
}

export interface PublishCreatorQuestInput {
  quest: {
    title: string;
    description: string;
    category_key: string;
    location: { lat: number; lng: number; city: string; country?: string; place_name?: string };
    start_time: string;
    duration_minutes: number;
    budget_amount?: number | null;
    max_participants: number;
    difficulty: string;
    xp_reward: number;
    objectives: { description: string }[];
  };
  price_amount: number;
}

export async function publishCreatorQuestAction(
  input: PublishCreatorQuestInput,
): Promise<ActionResult<CreatorQuestOut>> {
  return post<CreatorQuestOut>("/creators/quests", input);
}

export async function purchaseMarketplaceQuestAction(questId: string): Promise<ActionResult<QuestOut>> {
  return post<QuestOut>(`/marketplace/${questId}/purchase`);
}
