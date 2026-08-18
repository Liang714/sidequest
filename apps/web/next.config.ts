import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Same-origin API deploy would make this simpler, but the API is
// deliberately a separate Fly.io origin from this Vercel deploy — so
// img-src/connect-src need it named explicitly, not just 'self'.
const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
const wsOrigin = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/api/v1";
const wsOriginBase = wsOrigin.replace(/\/api\/v1$/, "");

// 'unsafe-inline' on script-src is the one real compromise here — Next.js
// injects its own small inline bootstrap script (theme/FOUC handling,
// see the <script> right after <body> on every page) that a strict
// nonce/hash-based CSP would need real wiring to allow; every actual
// user-generated string in this app (quest titles/descriptions, chat
// messages, profile bios) already goes through React's own JSX escaping
// — see the "no dangerouslySetInnerHTML anywhere" audit — so this CSP is
// a second layer on top of that, not the only thing standing between an
// attacker and script execution.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin} ${wsOriginBase}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Workspace packages ship as plain TS/JSON, not pre-built — let Next.js
  // transpile them itself rather than adding a build step to each package.
  transpilePackages: ["@sidequest/design-tokens", "@sidequest/i18n", "@sidequest/types"],
  reactStrictMode: true,
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ];
    // CSP only in production: `next dev`'s Fast Refresh/HMR runtime needs
    // 'unsafe-eval' to function at all, which would otherwise force a
    // real weakening of the *production* policy just to keep local dev
    // working. Verified directly, not assumed: the real production build
    // (`next build && next start`) works perfectly under the full CSP
    // below — quest-room WebSocket, photo upload/display, all of it —
    // it's specifically `next dev` that breaks (shows "Reconnecting to
    // the room…" — a CSP-blocked eval() call inside webpack's dev-mode
    // HMR client, not a real bug in the policy itself).
    if (process.env.NODE_ENV !== "production") return [{ source: "/:path*", headers: baseHeaders }];
    return [{ source: "/:path*", headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp }] }];
  },
};

export default withNextIntl(nextConfig);
