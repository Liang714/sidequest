import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { MapPin } from "@/components/map-pin";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { getLocationCookie, DEFAULT_SEOUL_CENTER } from "@/lib/location";
import { categoryEmoji } from "@/lib/types";
import { categoryShortKey } from "@/lib/format";
import type { QuestSummaryOut } from "@sidequest/types";

// Real quest coordinates aren't in QuestSummaryOut (only location_city) —
// fetching /quests/nearby already implies "close to this center," so pins
// are laid out on a simple radial spread around the center rather than
// true lat/lng projection. A real map (MapLibre + Kakao/Mapbox tiles) is
// Phase-2-continuation scope per docs/ARCHITECTURE.md §Maps; this stays an
// honest placeholder, now backed by real quests instead of mock ones.
function radialPosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  const radius = 28 + (index % 3) * 10;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

export default async function MapPage() {
  await requireSession();
  const t = await getTranslations();

  const coords = (await getLocationCookie()) ?? DEFAULT_SEOUL_CENTER;
  const quests = await apiFetch<QuestSummaryOut[]>(
    `/quests/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=15&limit=20`,
  );

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[22px] font-bold text-ink">{t("map.title")}</h1>
      <p className="mb-4 text-[13px] text-ink-muted">{t("map.subtitle")}</p>

      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-card border border-line"
        style={{
          backgroundColor: "var(--surface)",
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent 64px)",
        }}
      >
        {quests.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-ink-faint">
            {t("home.emptyNearby")}
          </div>
        ) : (
          quests.map((q, i) => {
            const pos = radialPosition(i, quests.length);
            return (
              <Link
                key={q.id}
                href={`/quests/${q.id}`}
                className="absolute"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <MapPin x={0} y={0} emoji={categoryEmoji[categoryShortKey(q.category_key)] ?? "✨"} kind="quest" label={q.title} />
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <LegendDot color="var(--accent-blue)" label={t("map.legendQuest")} />
      </div>

      <p className="mt-5 rounded-card border border-line bg-surface p-3.5 text-[12px] leading-relaxed text-ink-faint">
        {t("map.placeholderNote")}
      </p>
    </AppShell>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
