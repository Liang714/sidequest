"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { BusinessOut, SponsoredQuestOut } from "@sidequest/types";

export interface BusinessActionResult {
  business?: BusinessOut;
  error?: string;
}

export interface CreateBusinessInput {
  name: string;
  category: string;
  location: { lat: number; lng: number; city: string; country?: string; place_name?: string };
  description?: string | null;
}

export async function createBusinessAction(input: CreateBusinessInput): Promise<BusinessActionResult> {
  try {
    const business = await apiFetch<BusinessOut>("/businesses", { method: "POST", body: input });
    revalidatePath("/", "layout");
    return { business };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export interface SponsoredQuestActionResult {
  sponsoredQuest?: SponsoredQuestOut;
  error?: string;
}

export interface CreateSponsoredQuestInput {
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
  sponsorship_type: string;
  discount_details?: Record<string, unknown> | null;
}

export async function createSponsoredQuestAction(
  businessId: string,
  input: CreateSponsoredQuestInput,
): Promise<SponsoredQuestActionResult> {
  try {
    const sponsoredQuest = await apiFetch<SponsoredQuestOut>(`/businesses/${businessId}/quests`, {
      method: "POST",
      body: input,
    });
    revalidatePath("/", "layout");
    return { sponsoredQuest };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function verifyBusinessAction(
  businessId: string,
  action: "verify" | "reject",
): Promise<BusinessActionResult> {
  try {
    const business = await apiFetch<BusinessOut>(`/admin/businesses/${businessId}/verify`, {
      method: "POST",
      body: { action },
    });
    revalidatePath("/", "layout");
    return { business };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
