"use server";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { ItineraryPlanOut } from "@sidequest/types";

export interface PlanItineraryResult {
  plan?: ItineraryPlanOut;
  error?: string;
  quotaExceeded?: boolean;
}

export async function planItineraryAction(
  freeText: string,
  coords: { lat: number; lng: number } | null,
): Promise<PlanItineraryResult> {
  try {
    const plan = await apiFetch<ItineraryPlanOut>("/ai/plan-itinerary", {
      method: "POST",
      body: { free_text: freeText, city: "Seoul", lat: coords?.lat, lng: coords?.lng },
    });
    return { plan };
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) {
      return { error: err.message, quotaExceeded: true };
    }
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
