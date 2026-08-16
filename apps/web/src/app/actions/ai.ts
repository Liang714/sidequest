"use server";

import { apiFetch, ApiError } from "@/lib/api-client";
import type { GeneratedQuestOut } from "@sidequest/types";

export interface GenerateQuestResult {
  draft?: GeneratedQuestOut;
  error?: string;
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
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
