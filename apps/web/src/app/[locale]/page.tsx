import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { getLocationCookie, DEFAULT_SEOUL_CENTER } from "@/lib/location";
import { isStartingSoon } from "@/lib/format";
import { CategoryChip } from "@/components/category-chip";
import type { QuestSummaryOut } from "@sidequest/types";
import type { Category } from "@/lib/types";

const FILTER_CATEGORIES: Category[] = ["gaming", "photography", "dance", "cafe", "food", "art"];

export default async function HomePage() {
  await requireSession();
  const t = await getTranslations();

  const coords = (await getLocationCookie()) ?? DEFAULT_SEOUL_CENTER;
  const [quests, recommended] = await Promise.all([
    apiFetch<QuestSummaryOut[]>(`/quests/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=15&limit=20`),
    apiFetch<QuestSummaryOut[]>(`/quests/recommended?lat=${coords.lat}&lng=${coords.lng}&limit=6`),
  ]);

  const now = quests.filter((q) => isStartingSoon(q.start_time));
  const rest = quests.filter((q) => !isStartingSoon(q.start_time));

  return (
    <AppShell>
      <section>
        <h1 className="font-display text-[26px] font-bold leading-[1.05] tracking-tight text-ink">
          {t("home.greeting")}
          <br />
          <span className="text-blue">{t("home.greetingAccent")}</span>
        </h1>
        <p className="mt-2 text-[14px] text-ink-muted">
          {t("home.subline", { count: quests.length })}
        </p>
      </section>

      <section className="mt-5 -mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} category={cat} label={t(`category.${cat}`)} />
          ))}
        </div>
      </section>

      {now.length > 0 && <SectionHeading title={t("home.sectionNow")} />}
      {now.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {now.map((q) => (
            <QuestCard key={q.id} quest={q} variant="row" />
          ))}
        </div>
      )}

      {recommended.length > 0 && (
        <>
          <SectionHeading title={t("home.sectionForYou")} />
          <div className="-mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex w-max gap-3">
              {recommended.map((q) => (
                <div key={q.id} className="w-[220px]">
                  <QuestCard quest={q} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <SectionHeading title={t("home.sectionNear")} />
      {rest.length === 0 && now.length === 0 ? (
        <EmptyState createHref="/quests/new" label={t("createQuest.title")} empty={t("home.emptyNearby")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-2">
          {rest.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between">
      <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
    </div>
  );
}

function EmptyState({ createHref, label, empty }: { createHref: string; label: string; empty: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line p-8 text-center">
      <span className="text-3xl">🗺️</span>
      <p className="text-[13px] text-ink-muted">{empty}</p>
      <Link
        href={createHref}
        className="rounded-button bg-blue px-4 py-2 font-display text-[12.5px] font-semibold text-white shadow-glow-blue"
      >
        {label}
      </Link>
    </div>
  );
}
