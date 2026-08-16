"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface OnboardingResult {
  error?: string;
}

/**
 * Persists interests only — the Phase 2 schema has no field for
 * onboarding's "group size" / "vibe" steps (those were UI-only concepts in
 * the Phase 1 prototype). They stay in the wizard for the intended product
 * experience but aren't sent anywhere yet; see docs/DATABASE.md for what
 * exists today. Interests, on the other hand, map straight onto
 * `user_interests`.
 */
export async function finishOnboardingAction(interestIds: string[]): Promise<OnboardingResult> {
  try {
    await apiFetch("/users/me/interests", { method: "PUT", body: { interest_ids: interestIds } });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
  redirect({ href: "/", locale: await getLocale() });
  return {};
}
