# AI Architecture — SIDEQUEST

AI is a layer on top of a working product, not the product. The MVP (Phase 2)
shipped with **zero** AI dependencies — the core loop (create/discover/join/
complete a quest) works without it. Phase 3 (AI quest generation,
compatibility scoring, content-based recommendations) and Phase 8
(multi-step itinerary planning, advisory-only photo verification,
AI-explained recommendations) are both implemented — see §Implementation
status below for what's real today vs. still aspirational.
[PRD.md](PRD.md) §Non-goals and [ROADMAP.md](ROADMAP.md).

## Provider abstraction

```
AIService
    ↓
Provider interface (generate_quest, plan_itinerary, explain_recommendation)
    ↓
Ollama adapter (qwen3:8b, local)   ← dev default
Anthropic adapter (Claude)          ← production target
[future: additional adapters, swappable via AI_PROVIDER env var]

VisionVerifier                      ← separate abstraction, see §Vision verification
    ↓
Ollama vision adapter (llava:7b, local)   ← the only implementation today
```

No module calls an LLM SDK directly — everything goes through `AIService`
(`services/api/app/ai/service.py`), which resolves the configured provider
adapter from `AI_PROVIDER`. This is what makes "swap the model later" a
config change, per the product spec's requirement to never tightly couple
to one provider — set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` and
nothing else in the codebase changes. `VisionVerifier` is a deliberately
separate, narrower abstraction (`app/vision/`, resolved via
`VISION_PROVIDER`) — image verification is a different capability with a
different (measured, weaker) trust profile than text generation, so it
isn't folded into `AIProvider`.

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
| `ItineraryPlanner` | Multi-step plan across several quests/activities | 8 — **done** |
| `BusinessRecommendation` | Suggests sponsorship opportunities to businesses | 5/6 |
| `ModerationAssistant` | Flags likely policy violations for human review — never auto-actions | 4/5 |
| `VisionVerifier` | Confirms photo objectives (e.g. "red vending machine present") | 8 — **done, advisory-only** |
| `RecommendationExplainer` | Explains *why* a quest was recommended, grounded in the real compatibility breakdown | 8 — **done** |

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
   the earlier stages produce. Not implemented — the conventional scorer
   from step 2 is still what ranks `GET /quests/recommended`.
5. **LLM-assisted reasoning** (Phase 8 — **done**): `POST /ai/
   explain-recommendation` explains *why* a specific quest was
   recommended, in one sentence, grounded in that user/quest's real
   `compute_compatibility()` breakdown — the model is handed the actual
   score components (shared category, budget fit, distance, time overlap,
   group-size fit) and told to explain *those*, not to freelance a reason.
   It never ranks candidates itself.

**An LLM call is never on the hot path of a plain discovery-feed request.**
Conventional filtering/ranking (steps 1–4) serves the default feed; AI is
invoked only for explicit AI-flagged interactions (generate-quest,
recommend-quests with a free-text prompt, "why recommended?" on a single
quest).

## Itinerary planning (Phase 8)

`POST /ai/plan-itinerary` implements the AI-agent user story from
[ROADMAP.md](ROADMAP.md) Phase 8 — a multi-step planner, not an
autonomous agent. Given a free-text goal and the user's location, the
model (`ItineraryPlanner`, `app/ai/itinerary_prompt.py`) proposes 2-4
ordered steps, each one of `join_quest` (must reference a real
currently-open quest from the candidate list it was given —
`parse_itinerary_json` drops any step whose `quest_id` isn't in that list
before the client ever sees it, so a hallucinated ID can't slip through),
`create_quest`, or `book_activity`.

**The model never executes anything.** The frontend (`/plan`,
`itinerary-planner-client.tsx`) renders each proposed step as its own
card with an explicit **Confirm** button; confirming calls the exact same
production action a manual join/create/book would call
(`joinQuestAction`/`createQuestAction`/availability-then-`createBookingAction`).
There is no code path from "AI proposed it" to "it happened" that skips
the user clicking Confirm on that specific step — this is what makes
"user-confirmed at every step that spends money or commits to a plan"
true of the implementation, not just the design intent.

## Vision verification (Phase 8)

`POST /quests/{id}/objectives/{objective_id}/verify-photo` runs an
uploaded photo through `VisionVerifier` (`app/vision/`, a local Ollama
vision model, `llava:7b` by default) to check whether it plausibly
satisfies a photo-verified objective (e.g. "photograph something red
nearby"). Per the Phase 8 exit criteria's explicit requirement to
*measure* accuracy before deciding whether it gates anything, a labeled
accuracy harness was built (`services/api/scripts/
measure_vision_accuracy.py` — 12 synthetic test cases: colored shapes,
text, a plain image, mixed true/false claims) and run against the real
model:

| Metric | Result |
|---|---|
| Correct | 58% |
| False positive (said match, wasn't one) | 17% |
| False negative (said no match, was one) | 25% |

**Conclusion: advisory-only.** A 25% false-negative rate would silently
block real, valid completions if this gated XP — worse than not having
the feature. `verify-photo` always completes the objective and always
returns the AI's `{ matches, confidence, explanation }` verdict alongside
it; the frontend shows the verdict as a labeled aside, never as a
pass/fail gate. This is the one AI feature in the app that is explicitly
*not* trusted to make a real decision, by design and by measurement, not
by accident.

## Logging & privacy

`ai_generations.prompt_context` stores **structured inputs only** — location,
budget, interest tags — never a raw chat transcript containing personally
identifiable information beyond what's already in the user's profile.
Generation results are retained for quality review and abuse investigation
under the same retention policy as other user content (see
[SECURITY.md](SECURITY.md)).

## Cost control

Implemented since Phase 6, via `app/services/ai_quota_service.py`: Free
tier gets **3 AI generations/day** (`FREE_DAILY_LIMIT`, counted from the
`ai_generations` table); Pro (`subscriptions.plan == "pro"`) is unlimited;
a Free user who exhausts the daily limit can buy a one-off 10-generation
credit pack instead of subscribing. The quota is **shared across every AI
feature that consumes a generation**, not per-feature — `quest_generation`
(Phase 3), `itinerary_planning` and `recommendation_explanation` (both
Phase 8) all draw from the same daily pool
(`ai_quota_service._COUNTED_GENERATION_TYPES`), so a user can't get around
the limit by switching which AI feature they call. Every consuming
endpoint calls `consume_quota()` and returns a 402 with a "buy credits"
signal on exhaustion — verified live in both the Phase 6 and Phase 8
Playwright runs. Beyond that, the only cost-control today is that Ollama
is free and local; adding a hard per-user rate limit (not just the daily
counter above) before flipping `AI_PROVIDER=anthropic` in any shared
environment is still a real prerequisite, not a nice-to-have.

## Implementation status (as of Phase 8)

What's real, verified against the live running stack (not just written):

- `POST /ai/generate-quest` — real Ollama (`qwen3:8b`) calls by default,
  producing a structured, clamped/validated draft in ~5–15s once the model
  is warm. Never auto-publishes; the frontend (`apps/web`'s "Generate with
  AI" panel on `/quests/new`) shows it as an editable form, exactly per
  §Quest generation flow above.
- `GET /quests/{id}/compatibility` and `GET /quests/recommended` — real,
  conventional-algorithm scoring (no LLM on this path), wired into the
  quest detail page's compatibility badge and the home page's "For You"
  section.
- `POST /ai/plan-itinerary` — real Ollama calls producing a validated,
  anti-hallucination-checked multi-step plan; every proposed step is
  user-confirmed through its real production action on `/plan`. See
  §Itinerary planning above.
- `POST /quests/{id}/objectives/{objective_id}/verify-photo` — real
  Ollama vision calls (`llava:7b`) against uploaded photos, advisory-only
  per the measured 58%/17%/25% accuracy result. See §Vision verification
  above.
- `POST /ai/explain-recommendation` — real Ollama calls producing a
  one-sentence explanation grounded in the real compatibility breakdown,
  shown via the "Why recommended?" button on the quest detail page.
- **Quota/cost control** — real, shared across all four AI-generation
  endpoints above. See §Cost control above.
- For every path above, `AnthropicProvider` is fully implemented
  (tool-use/forced structured output where applicable) but untested
  against a real key — set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`
  to use it.
- **Ollama itself**: this dev machine already had a long-running personal
  Ollama install (predating this project, serving other local-AI use) —
  `setup-local-infra.sh` detects and reuses whatever's already listening
  on `127.0.0.1:11434` rather than starting a second, competing server.
  It only installs its own self-contained copy under `.tools/` if nothing
  is running yet. Either way, `qwen3:8b` (~5.2GB, text) and `llava:7b`
  (~4.7GB, vision) get pulled into whichever installation ends up serving
  requests.
- **Not implemented**: `BusinessRecommendation`, `ModerationAssistant`
  (both later phases per the table above), Voyage embeddings /
  pgvector-backed content ranking (§Recommendations still runs the
  simplified conventional scorer), ML re-ranking.
