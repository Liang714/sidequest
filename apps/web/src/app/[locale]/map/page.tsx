import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { MapPin } from "@/components/map-pin";
import { Link } from "@/i18n/navigation";
import { quests } from "@/lib/mock-data";
import { categoryEmoji } from "@/lib/types";

const BUSINESS_PINS = [
  { x: 40, y: 50, label: "ABC Dance Studio" },
  { x: 15, y: 65, label: "Local Roastery" },
];
const FRIEND_PINS = [{ x: 60, y: 42, label: "Alex is nearby" }];

export default async function MapPage() {
  const t = await getTranslations();

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
        {quests.map((q) => (
          <Link
            key={q.id}
            href={`/quests/${q.id}`}
            className="absolute"
            style={{ left: `${q.mapPosition.x}%`, top: `${q.mapPosition.y}%` }}
          >
            <MapPin x={0} y={0} emoji={categoryEmoji[q.category]} kind="quest" label={q.title} />
          </Link>
        ))}
        {BUSINESS_PINS.map((p, i) => (
          <MapPin key={`biz-${i}`} x={p.x} y={p.y} emoji="🏪" kind="business" label={p.label} />
        ))}
        {FRIEND_PINS.map((p, i) => (
          <MapPin key={`friend-${i}`} x={p.x} y={p.y} emoji="🙂" kind="friend" label={p.label} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <LegendDot color="var(--accent-blue)" label={t("map.legendQuest")} />
        <LegendDot color="var(--accent-violet)" label={t("map.legendBusiness")} />
        <LegendDot color="var(--accent-lime)" label={t("map.legendFriend")} />
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
