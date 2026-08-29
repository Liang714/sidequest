"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { ReportOut, ReportTargetType } from "@sidequest/types";

export interface ReportActionResult {
  report?: ReportOut;
  error?: string;
}

export async function resolveReportAction(
  reportId: string,
  action: "action" | "dismiss",
): Promise<ReportActionResult> {
  try {
    const report = await apiFetch<ReportOut>(`/admin/reports/${reportId}/resolve`, {
      method: "POST",
      body: { action },
    });
    revalidatePath("/", "layout");
    return { report };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

/**
 * User-facing report. `POST /reports` has existed since the Phase 2 trust
 * & safety work but nothing in the web client called it — reporting was
 * effectively unreachable, while the admin queue that consumes it was not.
 */
export async function submitReportAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<ReportActionResult> {
  try {
    const report = await apiFetch<ReportOut>("/reports", {
      method: "POST",
      body: { target_type: input.targetType, target_id: input.targetId, reason: input.reason },
    });
    return { report };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
