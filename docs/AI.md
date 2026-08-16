# AI Architecture — SIDEQUEST

AI is a layer on top of a working product, not the product. The MVP (Phase 2)
shipped with **zero** AI dependencies — the core loop (create/discover/join/
complete a quest) works without it. Phase 3 (AI quest generation,
compatibility scoring, content-based recommendations) is implemented — see
§Implementation status below for what's real today vs. still aspirational.
[PRD.md](PRD.md) §Non-goals and [ROADMAP.md](ROADMAP.md).

## Provider abstraction

```
AIService
    ↓
Provider interface (generate_quest)
    ↓
Ollama adapter (qwen3:8b, local)   ← dev default
Anthropic adapter (Claude)          ← production target
[future: additional adapters, swappable via AI_PROVIDER env var]
```

No module calls an LLM SDK directly — everything goes through `AIService`
(`services/api/app/ai/service.py`), which resolves the configured provider
adapter from `AI_PROVIDER`. This is what makes "swap the model later" a
config change, per the product spec's requirement to never tightly couple
to one provider — set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` and
nothing else in the codebase changes.

**Why Ollama is the dev default, not Claude:** same cost posture as the
rest of Phase 2 (local Postgres/Valkey over managed services, self-issued
JWTs over Supabase) — free, no API key needed, until there's a reason to
pay. `qwen3:8b` runs well on Apple Silicon via Ollama's Metal backend.

## AI modules

| Module | Responsibility | Phase |
|---|---|---|
| `QuestGenerator` | Free-text situation → structured draft quest (title, objectives, difficulty, XP) | 3 — **done** |
| `UserMatcher` (compatibility) | Compatibility scoring — conventional algorithm, not LLM, see [ARCHITECTURE.md](ARCHITECTURE.md) §Matching | 3 — **done** |
| `QuestRecommender` | Rank quests for a user via interest-tag overlap + proximity + fill-ratio (see §Recommendations — not embedding-based yet, pgvector isn't available) | 3 — **done, simplified** |
| `ItineraryPlanner` | Multi-step plan across several quests/activities | 8 |
| `BusinessRecommendation` | Suggests sponsorship opportunities to businesses | 5/6 |
| `ModerationAssistant` | Flags likely policy violations for human review — never auto-actions | 4/5 |
| `VisionVerifier` | Confirms photo objectives (e.g. "red vending machine present") | 8 |

## Quest generation flow

User free text + structured context (location, time, weather, budget,
interests, group size, nearby businesses) → `QuestGenerator` (Claude) →
structured JSON draft (title, objectives, difficulty, XP reward) → shown to
the user as an **editable draft** → user edits/publishes or discards.

**AI never auto-publishes.** Every generation ends at a draft a human
approves — this is a hard rule, not an implementation detail, because an
auto-published bad quest is a real-world safety and trust problem, not just
a UX bug.

## Recommendations

Phased, cheapest-effective-method first (product spec §33):

1. **Rule-based** (Phase 2/3): location, category, time, budget filters —
   `GET /quests`, `GET /quests/nearby`.
2. **Content-based** (Phase 3): the target design is pgvector cosine
   similarity between `user_preference_embeddings` and `quest_embeddings`
   (Voyage embeddings). What's actually running today is a **simpler
   real substitute**: `compute_compatibility()`
   (`services/api/app/services/compatibility_service.py`) scores interest-
   tag overlap + proximity + fill-ratio, and `GET /quests/recommended`
   ranks the open-quest candidate pool by that score. It's genuinely
   content-based (real per-user ranking, not just filters) — it's just not
   embedding-backed, because pgvector isn't installed on this dev machine
   (see [DATABASE.md](DATABASE.md)). The `quest_embeddings` /
   `user_preference_embeddings` columns already exist for when it is —
   swapping the ranking function is additive, not a rewrite.
3. **Collaborative** (Phase 4+): completed quests, joins, skips as implicit
   feedback.
4. **ML ranking** (Phase 8+): learned re-ranking on top of the candidate set
   the earlier stages produce.
5. **LLM-assisted reasoning** (Phase 8+): only for explaining *why* something
   was recommended, or resolving ambiguous free-text queries — not for
   ranking every candidate, which would be slow and needlessly expensive.

**An LLM call is never on the hot path of a plain discovery-feed request.**
Conventional filtering/ranking (steps 1–4) serves the default feed; AI is
invoked only for explicit AI-flagged interactions (generate-quest,
recommend-quests with a free-text prompt).

## Logging & privacy

`ai_generations.prompt_context` stores **structured inputs only** — location,
budget, interest tags — never a raw chat transcript containing personally
identifiable information beyond what's already in the user's profile.
Generation results are retained for quality review and abuse investigation
under the same retention policy as other user content (see
[SECURITY.md](SECURITY.md)).

## Cost control

AI usage is metered per user (`ai_generations` count/window) and gated by
plan (`subscriptions.plan`) — Free tier gets a limited number of generations
per day; Pro gets a higher limit; further usage is available as purchasable
AI credits (Phase 6). Not implemented yet — Phase 6 depends on
`subscriptions` existing at all (Phase 6 scope). Today the only real
cost-control is that Ollama is free and local; adding a per-user rate
limit before flipping `AI_PROVIDER=anthropic` in any shared environment is
a real prerequisite, not a nice-to-have.

## Implementation status (Phase 3)

What's real, verified against the live running stack (not just written):

- `POST /ai/generate-quest` — real Ollama (`qwen3:8b`) calls by default,
  producing a structured, clamped/validated draft in ~5–15s once the model
  is warm. Never auto-publishes; the frontend (`apps/web`'s "Generate with
  AI" panel on `/quests/new`) shows it as an editable form, exactly per
  §Quest generation flow above. `AnthropicProvider` is fully implemented
  (tool-use/forced structured output) but untested against a real key —
  set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` to use it.
- `GET /quests/{id}/compatibility` and `GET /quests/recommended` — real,
  conventional-algorithm scoring (no LLM on this path), wired into the
  quest detail page's compatibility badge and the home page's "For You"
  section.
- **Ollama itself**: this dev machine already had a long-running personal
  Ollama install (predating this project, serving other local-AI use) —
  `setup-local-infra.sh` detects and reuses whatever's already listening
  on `127.0.0.1:11434` rather than starting a second, competing server.
  It only installs its own self-contained copy under `.tools/` if nothing
  is running yet. Either way, `qwen3:8b` (~5.2GB) gets pulled into
  whichever installation ends up serving requests.
- **Not implemented**: `ItineraryPlanner`, `BusinessRecommendation`,
  `ModerationAssistant`, `VisionVerifier` (all later phases per the table
  above), Voyage embeddings, AI usage metering/credits.
