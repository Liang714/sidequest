import "server-only";
import { getAccessToken } from "./session";

// Server-side only — every fetch to services/api goes through here so auth
// header attachment and error shape stay in one place. See docs/API.md for
// the error envelope this unwraps ({"detail": "..."} from FastAPI's
// HTTPException, or a Pydantic validation array).
const API_BASE = process.env.API_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(extractMessage(detail));
    this.name = "ApiError";
  }
}

function extractMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "detail" in detail) {
    const inner = (detail as { detail: unknown }).detail;
    if (typeof inner === "string") return inner;
    if (Array.isArray(inner)) {
      return inner
        .map((e) => (e && typeof e === "object" && "msg" in e ? String(e.msg) : JSON.stringify(e)))
        .join("; ");
    }
  }
  return "Request failed";
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  /** Attach the session's access token. Default true. */
  auth?: boolean;
  cache?: RequestCache;
  revalidate?: number | false;
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache,
    next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
  });

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
