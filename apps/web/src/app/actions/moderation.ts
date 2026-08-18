"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { ReportOut } from "@sidequest/types";

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
