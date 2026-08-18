// Server/edge error tracking — see docs/DEPLOYMENT.md. True no-op without
// a DSN: Sentry.init() is simply never called, not just configured to
// send nowhere. Deliberately scoped to server + edge only (this file is
// Next.js's native instrumentation hook, stable since Next 15, no
// Sentry webpack plugin/next.config.ts wrapping needed) — client-side
// browser error capture is a deliberate scope cut for this first pass,
// not an oversight; server-side (Server Actions, SSR, route handlers) is
// where most real errors in this app actually originate.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
