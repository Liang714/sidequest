"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import type { NotificationOut } from "@sidequest/types";

export interface NotificationActionResult {
  error?: string;
}

/**
 * PATCH /notifications/{id}/read has shipped in the API since Phase 2 but
 * no client had ever called it — the entire re-engagement loop was unbuilt
 * (spec §A1 finding 1).
 */
export async function markNotificationReadAction(id: string): Promise<NotificationActionResult> {
  try {
    await apiFetch<NotificationOut>(`/notifications/${id}/read`, { method: "PATCH" });
    revalidatePath("/notifications");
    return {};
  } catch {
    return { error: "failed" };
  }
}

export async function markAllNotificationsReadAction(ids: string[]): Promise<NotificationActionResult> {
  // The API has no bulk endpoint; a handful of parallel PATCHes is honest
  // and keeps the server contract unchanged. Revisit if lists grow past the
  // 30-item page the endpoint returns.
  const results = await Promise.allSettled(
    ids.map((id) => apiFetch<NotificationOut>(`/notifications/${id}/read`, { method: "PATCH" })),
  );
  revalidatePath("/notifications");
  return results.some((r) => r.status === "rejected") ? { error: "partial" } : {};
}
