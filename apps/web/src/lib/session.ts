import "server-only";
import { cookies } from "next/headers";
import type { TokenPair } from "@sidequest/types";

// Cookie-based session — httpOnly so quest-room chat's access token (the
// one exception, passed into a client component to open the WebSocket) is
// the only place a token ever reaches client JS, and even then only for
// the lifetime of that one page load. See app/[locale]/quests/[id]/room
// for that call site and its own note on the tradeoff.
const ACCESS_COOKIE = "sq_access_token";
const REFRESH_COOKIE = "sq_refresh_token";

// Matches app/config.py's access_token_ttl_minutes / refresh_token_ttl_days
// defaults — see services/api/app/config.py if those ever change.
const ACCESS_TTL_SECONDS = 30 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Server Action / Route Handler only — Server Components can't write cookies. */
export async function setSession(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.access_token, { ...cookieOptions, maxAge: ACCESS_TTL_SECONDS });
  store.set(REFRESH_COOKIE, tokens.refresh_token, { ...cookieOptions, maxAge: REFRESH_TTL_SECONDS });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}
