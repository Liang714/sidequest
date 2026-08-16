"use server";

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { apiFetch, ApiError } from "@/lib/api-client";
import { clearSession, setSession } from "@/lib/session";
import type { TokenPair } from "@sidequest/types";

export interface ActionResult {
  error?: string;
}

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");

  let tokens: TokenPair;
  try {
    tokens = await apiFetch<TokenPair>("/auth/register", {
      method: "POST",
      auth: false,
      body: { email, username, password, display_name: displayName },
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong. Try again." };
  }

  await setSession(tokens);
  redirect({ href: "/onboarding", locale: await getLocale() });
  return {};
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let tokens: TokenPair;
  try {
    tokens = await apiFetch<TokenPair>("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong. Try again." };
  }

  await setSession(tokens);
  redirect({ href: "/", locale: await getLocale() });
  return {};
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect({ href: "/login", locale: await getLocale() });
}
