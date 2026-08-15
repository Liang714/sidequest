# User Flows — SIDEQUEST

All primary flows target **≤4 steps to value** — a spontaneous-activity app
that requires deliberation up front defeats its own premise.

## 1. Onboarding

```mermaid
flowchart LR
    A[Open app, no account] --> B[Sign up: email/social via Supabase Auth]
    B --> C["Step 1: What are you into? (interests, multi-select)"]
    C --> D["Step 2: Alone / small group / large group?"]
    D --> E["Step 3: Chill / spontaneous / competitive / creative / adventurous / social?"]
    E --> F["Step 4: Location permission (with plain-language why)"]
    F --> G[Home feed, pre-filtered to selections]
```

Four steps, no required fields beyond what directly improves the first
feed a user sees. Real name, bio, and profile photo are optional and can be
added later from Profile settings.

## 2. Core loop — discover to complete (MVP)

```mermaid
flowchart LR
    A[Open app] --> B{Onboarded?}
    B -- no --> C[Onboarding, see above]
    C --> D[Home: Now / Near You / Trending]
    B -- yes --> D
    D --> E[Quest Detail]
    E --> F[Join Quest]
    F --> G[Quest Room: chat, objectives, meeting point]
    G --> H[Check-in at meeting point]
    H --> I[Complete objectives]
    I --> J[XP + achievements awarded]
    J --> K[Quest archived to history]
    K --> L[Optional: add participants as friends]
```

## 3. Quest creation

```mermaid
flowchart LR
    A[Tap Create] --> B[Title + description]
    B --> C[Location]
    C --> D[Date, start time, duration]
    D --> E[Budget]
    E --> F[Max participants]
    F --> G[Category]
    G --> H["Visibility: public / friends-only / private invite"]
    H --> I[Publish]
    I --> J[Appears in discovery feed matching its filters]
```

## 4. AI quest generation *(Phase 3 — architecture reserved now, not built in MVP)*

```mermaid
sequenceDiagram
    participant U as User
    participant App
    participant AI as AIService → QuestGenerator (Claude)
    U->>App: "Bored, near Hongdae, 3h, ₩20,000, like dancing+photography"
    App->>AI: prompt + context (location, time, weather, budget, prefs, nearby businesses)
    AI-->>App: draft quest (title, objectives, difficulty, XP reward)
    App-->>U: editable draft, not yet published
    U->>App: edit and publish (or discard)
    App->>App: publishes exactly like a manually created quest
```

AI never auto-publishes on a user's behalf — every generation ends at an
editable draft. See [AI.md](AI.md).

## 5. Friend request

```mermaid
flowchart LR
    A[View profile or quest room participant] --> B[Send friend request]
    B --> C{Recipient responds}
    C -- accept --> D[Friends — independent of any shared quest]
    C -- ignore/reject --> E[No relationship change, no notification spam]
```

## 6. Business sponsorship *(Phase 5)*

```mermaid
flowchart LR
    A[Business registers] --> B[Verification]
    B --> C[Create sponsored quest: requirements + discount reward]
    C --> D[Admin/automated review]
    D --> E[Quest live in discovery, marked Sponsored]
    E --> F[Users join and complete]
    F --> G[Business sees campaign analytics: views, joins, completions, redemptions]
```

## 7. Report / block (safety-critical, always reachable)

```mermaid
flowchart LR
    A[From any profile, quest, or message] --> B[Report or Block]
    B -- Report --> C[Reason selected, sent to moderation queue]
    B -- Block --> D[Immediate: no discovery, no messages, no quest visibility between the two users]
    C --> E[Admin reviews with full context — see SECURITY.md]
```
