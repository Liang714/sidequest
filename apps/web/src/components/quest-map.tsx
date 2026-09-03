"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui";
import { CategoryIcon } from "./category-icon";
import { categoryShortKey } from "@/lib/format";
import type { Category } from "@/lib/types";
import type { QuestSummaryOut } from "@sidequest/types";

/**
 * Quest map — real relative positions, not a decorative spread.
 *
 * This is deliberately NOT a tiled map. MapLibre plus a tile provider is
 * real scope (docs/ARCHITECTURE.md §Maps) and carries per-request cost; it
 * belongs in a decision, not smuggled in here. What this does give is
 * geographic truth: quests are projected from their actual coordinates onto
 * a local plane centred on the user, so bearing, relative distance and
 * clustering are all correct. A pin to the northeast really is northeast.
 *
 * Equirectangular projection with a cos(lat) correction on longitude —
 * accurate at city scale, which is the only scale this view covers.
 *
 * People are never plotted. Quests have public meeting points; a person's
 * position is never exposed anywhere in this product (spec §L principle 5).
 */

const CATEGORY_COLOR: Partial<Record<Category, string>> = {
  photography: "var(--accent-info)",
  food: "var(--accent-warn)",
  cafe: "var(--accent-warn)",
  dance: "var(--accent-hot)",
  music: "var(--accent-hot)",
  art: "var(--accent-mint)",
  exploration: "var(--accent-mint)",
};

function colorFor(category: Category): string {
  return CATEGORY_COLOR[category] ?? "var(--ink-muted)";
}

export function QuestMap({
  quests,
  center,
  radiusKm,
}: {
  quests: QuestSummaryOut[];
  center: { lat: number; lng: number };
  radiusKm: number;
}) {
  const t = useTranslations();
  const [active, setActive] = useState<string | null>(null);

  // Quests are grouped into clusters by proximity. Several commonly share
  // one meeting point ("Exit 9, Hongik Univ."), which projects them onto
  // identical pixels — fanning them out only works for two or three, and
  // the pin on top silently swallows taps meant for the ones underneath.
  // Collapsing to a single pin with a count is the behaviour a real map
  // would have anyway, and it holds at any density.
  const clusters = useMemo(() => {
    const kmPerDegLat = 111.32;
    const kmPerDegLng = 111.32 * Math.cos((center.lat * Math.PI) / 180);
    const scale = 45 / radiusKm; // map the radius onto 45% of the box

    const points = quests.map((q) => {
      const dx = (q.lng - center.lng) * kmPerDegLng; // east positive
      const dy = (q.lat - center.lat) * kmPerDegLat; // north positive
      return {
        quest: q,
        // Clamp so a quest just outside the radius renders at the rim
        // rather than escaping the container.
        x: Math.max(4, Math.min(96, 50 + dx * scale)),
        y: Math.max(4, Math.min(96, 50 - dy * scale)),
        km: Math.hypot(dx, dy),
      };
    });

    // Greedy single-pass clustering: near enough to touch on screen at a
    // 32px pin gets merged. Deterministic given a stable quest order.
    const MERGE_DISTANCE = 9; // percent of the box
    const out: {
      id: string;
      x: number;
      y: number;
      km: number;
      quests: QuestSummaryOut[];
    }[] = [];

    for (const point of points) {
      const near = out.find(
        (c) => Math.hypot(c.x - point.x, c.y - point.y) < MERGE_DISTANCE,
      );
      if (near) {
        near.quests.push(point.quest);
        // Keep the cluster anchored at the running mean of its members.
        const n = near.quests.length;
        near.x += (point.x - near.x) / n;
        near.y += (point.y - near.y) / n;
        near.km = Math.min(near.km, point.km);
      } else {
        out.push({ id: point.quest.id, x: point.x, y: point.y, km: point.km, quests: [point.quest] });
      }
    }
    return out;
  }, [quests, center, radiusKm]);

  const activeCluster = clusters.find((c) => c.id === active);

  return (
    <div>
      <div
        className="relative aspect-square w-full overflow-hidden rounded-card border border-line bg-surface"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 48px)",
        }}
      >
        {/* Distance rings at a third and two thirds of the radius. */}
        {[30, 60, 90].map((pct) => (
          <span
            key={pct}
            aria-hidden
            className="absolute left-1/2 top-1/2 rounded-pill border border-line"
            style={{
              width: `${pct}%`,
              height: `${pct}%`,
              transform: "translate(-50%, -50%)",
              opacity: 0.5,
            }}
          />
        ))}

        {/* You are here. Named for screen readers, since "the centre" is a
            purely visual convention. */}
        <span
          role="img"
          aria-label={t("map.youAreHere")}
          className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-surface bg-ink"
        />

        {clusters.map((cluster) => {
          const lead = cluster.quests[0]!;
          const category = categoryShortKey(lead.category_key);
          const isActive = cluster.id === active;
          const count = cluster.quests.length;
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => setActive(isActive ? null : cluster.id)}
              aria-label={
                count > 1 ? t("map.clusterLabel", { count }) : lead.title
              }
              aria-pressed={isActive}
              className={clsx(
                "absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border-2 border-surface",
                "transition-transform duration-150 ease-crew",
                isActive ? "z-10 scale-125" : "hover:scale-110",
              )}
              style={{
                left: `${cluster.x}%`,
                top: `${cluster.y}%`,
                background: count > 1 ? "var(--accent-hot)" : colorFor(category),
              }}
            >
              {count > 1 ? (
                <span className="text-caption font-extrabold tabular-nums text-[#12100E]">
                  {count}
                </span>
              ) : (
                <CategoryIcon category={category} className="h-4 w-4 text-[#12100E]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tapping a pin peeks the quest(s) rather than navigating away, so
          the user keeps their place on the map. */}
      {activeCluster ? (
        <ul className="mt-3 flex flex-col gap-2">
          {activeCluster.quests.map((q) => {
            const category = categoryShortKey(q.category_key);
            return (
              <li key={q.id}>
                <Link
                  href={`/quests/${q.id}`}
                  className="block rounded-card border border-line bg-surface p-4 shadow-e1"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge
                      tone="neutral"
                      icon={<CategoryIcon category={category} className="h-3 w-3" />}
                    >
                      {t(`category.${category}`)}
                    </Badge>
                    <span className="text-caption tabular-nums text-ink-faint">
                      {activeCluster.km.toFixed(1)} km
                    </span>
                  </div>
                  <p className="text-h3 text-ink">{q.title}</p>
                  <p className="text-caption text-ink-muted">
                    {q.location_city} ·{" "}
                    {t("quest.participants", {
                      joined: q.joined_count,
                      max: q.max_participants,
                    })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-center text-caption text-ink-faint">{t("map.tapPin")}</p>
      )}
    </div>
  );
}
