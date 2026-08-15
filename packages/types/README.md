# packages/types

Shared TypeScript types generated from `services/api`'s FastAPI OpenAPI
schema (`/api/v1/openapi.json`), consumed by both `apps/web` and
`apps/mobile` so the clients and backend can't silently drift apart. See
[../../docs/API.md](../../docs/API.md).

Empty on purpose in Phase 0 — first generated once `services/api` exists in
Phase 2.
