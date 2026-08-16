# packages/types

TypeScript types generated from `services/api`'s live OpenAPI schema via
`openapi-typescript`, consumed by `apps/web` so the frontend and backend
can't silently drift apart — see [../../docs/API.md](../../docs/API.md).

- `api.ts` — full generated output (`paths`, `components`, `operations`).
  **Do not hand-edit** — regenerate it.
- `index.ts` — friendly named aliases (`QuestOut`, `TokenPair`, ...) over
  `api.ts`'s `components["schemas"]`, so call sites don't have to dig
  through the raw `paths[...]["post"]["responses"]["201"]...` shape.

Regenerate after any `services/api` schema change (with the API running
locally):

```bash
cd packages/types && pnpm generate
```
