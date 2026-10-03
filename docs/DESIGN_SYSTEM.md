# Design System — SIDEQUEST

**Bold Pop**: neo-brutalist. Loud, quirky, memorable; built for students who
speak in stickers. Light only.

The full system lives in
[superpowers/specs/2026-10-03-bold-pop-design.md](superpowers/specs/2026-10-03-bold-pop-design.md):
palette and contrast table, type, components with every state, IA, motion
spec, accessibility, handoff checklist and usability test plan. A live
reference renders at `/dev/kitchen-sink` in dev builds.

Tokens live in `packages/design-tokens/tokens.ts`, consumed by `apps/web`
(Tailwind CSS + CSS variables in `src/app/globals.css`) and, once scaffolded,
`apps/mobile` (NativeWind v4). See [ARCHITECTURE.md](ARCHITECTURE.md).

## At a glance

| | |
|---|---|
| Brand fills | Yellow `#FFE14D` (primary action) · Blue `#3B5BFF` (AI, links, secondary) · Pink `#FF8FB1` (friend, confirmed, earned) |
| Ink and outlines | Black `#000000`, 2px everywhere; no hairlines |
| Surfaces | Canvas `#FFFBEA`, cards and fields `#FFFFFF` |
| Elevation | Hard, zero-blur black offsets: 3 / 5 / 8px |
| Type | Space Grotesk 400–700; Hangul falls back to the system Korean face |
| Motion | Snappy near-linear (`snap`), overshoot (`pop`) only for celebrations, press = shadow removed + element pushed in (90ms linear) |

## Rules that are easy to break

1. **Yellow and pink are never text** (1.3:1 and 2.1:1). Use the role's
   `*-text` token. Only blue takes white text; every other fill takes black.
2. **No soft shadows**, only `shadow-e1/e2/e3`.
3. **Interactive slabs use `.pressable`** (or `Button`), so press feedback is
   consistent.
4. **Colour is never the only signal.** Selected = check icon; disabled =
   dashed + no shadow; errors = written text.
5. **Every animation degrades under `prefers-reduced-motion`** to its end
   state, never to a missing state.
6. **Rule of Faces:** 46px overlapping stacks only on crew cards; 32px for
   browsable people; no face grids.

Previous systems: CREW (2026-08-27, warm and people-first; its IA and product
rules carry forward) and SIGNAL (reserved). Both specs are in
`superpowers/specs/`.
