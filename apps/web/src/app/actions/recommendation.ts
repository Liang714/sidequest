"use server";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { ExplainRecommendationOut } from "@sidequest/types";

export interface ExplainRecommendationResult {
  data?: ExplainRecommendationOut;
  error?: string;
  quotaExceeded?: boolean;
}

export async function explainRecommendationAction(
  questId: string,
  coords: { lat: number; lng: number } | null,
): Promise<ExplainRecommendationResult> {
  try {
    const data = await apiFetch<ExplainRecommendationOut>("/ai/explain-recommendation", {
      method: "POST",
      body: { quest_id: questId, lat: coords?.lat, lng: coords?.lng },
    });
    return { data };
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) {
      return { error: err.message, quotaExceeded: true };
    }
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
