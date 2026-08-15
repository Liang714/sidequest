# Personas — SIDEQUEST

Four personas covering the primary user types from the product spec (§4).
Admin/moderator is treated as an operational role, not a discovery-driven
persona — its needs are covered functionally in [ARCHITECTURE.md](ARCHITECTURE.md)
and [SECURITY.md](SECURITY.md).

---

## Erh — Normal User

**24, office worker, Seoul.** Free most weekday evenings and weekends, but her
social circle is mostly coworkers she sees enough of already. Has hobbies
(photography, dancing, café-hopping) she rarely acts on alone.

- **Goal:** turn a random free evening into something better than staying home,
  without the planning overhead of organizing a group chat from scratch.
- **Frustration:** "I have plans in my head but no one to do them with, and by
  the time I've asked five people the moment has passed."
- **Primary features:** Discover (Now/Near You), quick quest join, quest rooms,
  XP/achievements as a light reward for actually going out.
- **Persona-defining moment:** joins a Random Dance Quest in Gangnam 45 minutes
  before it starts, meets three strangers, adds two as friends afterward.

---

## Jamie — Normal User (expat)

**27, works in tech, Seoul.** Limited Korean, has been in the city 8 months.
Wants a social circle outside the office but finds most local social apps
either dating-coded or assume fluent Korean.

- **Goal:** low-pressure group activities in public places where language
  barriers don't block participation.
- **Frustration:** existing meetup-style apps in Korea skew heavily Korean-
  language-first and don't signal whether an event is welcoming to non-fluent
  speakers.
- **Primary features:** language filter in discovery, compatibility scoring
  that weights language compatibility, public-meeting-place safety design.
- **Persona-defining moment:** filters quests by "English OK," joins a Photo
  Hunt in Seongsu, and it doesn't matter that their Korean is beginner-level.

---

## @seoulwalker — Quest Creator

**Late 20s, amateur photographer**, ~2K followers on other platforms, knows
Seoul's less-obvious spots. Wants to turn that local knowledge into modest
recurring income without becoming a full-time tour guide.

- **Goal:** package a repeatable experience ("Hidden Seoul Café Hunt") once,
  sell it many times, see who's completing it.
- **Frustration:** platforms either take a huge cut or require heavyweight
  business registration for something this small.
- **Primary features:** quest templates, follower growth, purchase/completion
  analytics, configurable revenue split (see [PRD.md](PRD.md) §Non-goals — full
  marketplace is Phase 6, not MVP).
- **Persona-defining moment:** checks analytics on a Sunday and sees 12 people
  completed their quest that week, unprompted.

---

## ABC Dance Studio — Business

**Small local business, Gangnam-adjacent.** Slow weekday afternoons, wants
foot traffic that converts to trial-class sign-ups without running paid ads
on platforms that don't know the local market well.

- **Goal:** measurable new-customer traffic from a low-cost, engaging
  challenge, not a generic ad impression.
- **Frustration:** ad spend on generic platforms is expensive and unmeasurable
  against actual walk-ins.
- **Primary features:** sponsored quest creation, discount-reward
  configuration, campaign analytics (Phase 5 — see [ROADMAP.md](ROADMAP.md)).
- **Persona-defining moment:** sponsors a K-Pop Random Dance Quest requiring
  3+ participants and a completion photo; 10% of participants book a trial
  class within the week.
