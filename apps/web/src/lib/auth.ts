import "server-only";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { apiFetch, ApiError } from "./api-client";
import { getAccessToken } from "./session";
import type { MeOut } from "@sidequest/types";

/**
 * Route guard for Server Component pages. Confirms the session cookie is
 * both present and still accepted by the API (covers both "never logged
 * in" and "access token expired" in one round trip, rather than trying to
 * validate the JWT locally) and returns the current user.
 *
 * No silent refresh here: Server Components can't write cookies (only
 * Server Actions/Route Handlers can), so an expired 30-minute access token
 * just sends the user back to /login — acceptable for an MVP session
 * length; see docs/ARCHITECTURE.md's auth seam note for what a real
 * refresh flow would hook into.
 */
export async function requireSession(): Promise<MeOut> {
  const token = await getAccessToken();
  if (!token) {
    redirect({ href: "/login", locale: await getLocale() });
  }
  try {
    return await apiFetch<MeOut>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect({ href: "/login", locale: await getLocale() });
    }
    throw err;
  }
}

/** Best-effort current user for pages that render differently but don't
 * hard-require a session (none currently do, kept for the one call site
 * that wants "logged in or not" without redirecting). */
export async function getOptionalSession(): Promise<MeOut | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<MeOut>("/auth/me");
  } catch {
    return null;
  }
}
