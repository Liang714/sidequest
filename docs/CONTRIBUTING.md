# Contributing — SIDEQUEST

## Branching

```
main        # always deployable, production
develop     # integration branch, deploys to staging
feature/*   # one feature/module per branch, off develop
bugfix/*    # off develop, or off main for a production hotfix
```

## Commits

Conventional commits, scoped to the module:

```
feat(auth): add registration endpoint
feat(quests): implement quest creation
feat(quests): add nearby discovery
feat(social): add friend request flow
feat(ai): add quest generator
fix(chat): resolve message ordering on reconnect
docs(database): document xp_transactions ledger semantics
```

## Before opening a PR

- `pnpm turbo lint typecheck test` (JS/TS packages) and
  `uv run ruff check && uv run mypy && uv run pytest` (`services/api`) pass
  locally.
- New endpoints/tables are reflected in [API.md](API.md)/[DATABASE.md](DATABASE.md)
  — docs and code move together, not in a separate cleanup pass.
- Anything touching auth, file upload, location, or payments includes the
  security test cases described in [SECURITY.md](SECURITY.md).

## Code style

- **TypeScript:** strict mode on, no implicit `any`, shared `tsconfig.base.json`
  at the repo root.
- **Python:** full type hints, `mypy` clean, Pydantic v2 models for every
  request/response shape — no untyped `dict` payloads crossing a module
  boundary.

## Review

At least one approving review before merge to `develop`; `main` only ever
receives merges from `develop` (or a hotfix branch for a production
incident) — no direct pushes.

## Environment setup

See the root [README.md](../README.md) for local dev setup
(`docker-compose`, `.env`, per-app install/run commands).
