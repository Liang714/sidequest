# AI Architecture — SIDEQUEST

AI is a layer on top of a working product, not the product. The MVP (Phase 2)
ships with **zero** AI dependencies — the core loop (create/discover/join/
complete a quest) must work without it. AI starts in Phase 3. See
[PRD.md](PRD.md) §Non-goals and [ROADMAP.md](ROADMAP.md).

## Provider abstraction

```
AIService
    ↓
Provider interface (generate, embed)
    ↓
Anthropic adapter (Claude)   ← default
Voyage adapter (embeddings)
[future: additional adapters, swappable via AI_PROVIDER env var]
```

No module calls an LLM SDK directly — everything goes through `AIService`,
which resolves the configured provider adapter
(`services/api/app/ai/providers/`). This is what makes "swap the model
later" a config change, per the product spec's requirement to never
tightly couple to one provider.

## AI modules

| Module | Responsibility | Phase |
|---|---|---|
| `QuestGenerator` | Free-text situation → structured draft quest (title, objectives, difficulty, XP) | 3 |
| `QuestRecommender` | Rank quests for a user via pgvector similarity (Voyage embeddings) + rule-based signals | 3 |
| `UserMatcher` | Compatibility scoring inputs/explanation (scoring logic itself is conventional, not LLM — see [ARCHITECTURE.md](ARCHITECTURE.md) §Matching) | 3 |
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

1. **Rule-based** (Phase 2/3): location, category, time, budget filters.
2. **Content-based** (Phase 3): pgvector cosine similarity between
   `user_preference_embeddings` and `quest_embeddings` (Voyage embeddings).
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
AI credits (Phase 6). This exists from Phase 3 onward so a single user can't
run up unbounded inference cost.
