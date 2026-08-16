"use server";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { AiQuotaOut, GeneratedQuestOut } from "@sidequest/types";

export interface GenerateQuestResult {
  draft?: GeneratedQuestOut;
  error?: string;
  /** Set (only) when the request failed because the free daily quota and
   * any purchased credits are both exhausted — see docs/ROADMAP.md Phase 6.
   * Distinct from a generic `error` so the UI can point at Pro/credits
   * instead of showing a bare error string. */
  quotaExceeded?: boolean;
}

export async function generateQuestDraftAction(
  freeText: string,
  coords: { lat: number; lng: number } | null,
): Promise<GenerateQuestResult> {
  try {
    const draft = await apiFetch<GeneratedQuestOut>("/ai/generate-quest", {
      method: "POST",
      body: { free_text: freeText, city: "Seoul", lat: coords?.lat, lng: coords?.lng },
    });
    return { draft };
  } catch (err) {
    if (err instanceof ApiError && err.status === 402) {
      return { error: err.message, quotaExceeded: true };
    }
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function getAiQuotaAction(): Promise<AiQuotaOut | null> {
  try {
    return await apiFetch<AiQuotaOut>("/ai/quota");
  } catch {
    return null;
  }
}
