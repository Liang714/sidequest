import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { CategoryChip } from "@/components/category-chip";
import { EmptyState } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { getLocationCookie, DEFAULT_SEOUL_CENTER } from "@/lib/location";
import { isStartingSoon } from "@/lib/format";
import { badgeCount } from "@/lib/notifications";
import type { NotificationOut, QuestSummaryOut } from "@sidequest/types";
import type { Category } from "@/lib/types";

const FILTER_CATEGORIES: Category[] = ["gaming", "photography", "dance", "cafe", "food", "art"];

/**
 * Tonight — spec §F1. The screen the user lands on.
 *
 * People-first: sections lead with crews that are forming, and each card
 * leads with who's going rather than with the activity. Capped at three
 * crew cards before the rest, because a wall of crews reads like a feed
 * and buries what makes this different.
 */
export default async function TonightPage() {
  await requireSession();
  const t = await getTranslations();

  const coords = (await getLocationCookie()) ?? DEFAULT_SEOUL_CENTER;
  const [quests, recommended, notifications] = await Promise.all([
    apiFetch<QuestSummaryOut[]>(
      `/quests/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=15&limit=20`,
    ),
    apiFetch<QuestSummaryOut[]>(
      `/quests/recommended?lat=${coords.lat}&lng=${coords.lng}&limit=6`,
    ).catch(() => [] as QuestSummaryOut[]),
    apiFetch<NotificationOut[]>("/notifications?limit=50").catch(() => [] as NotificationOut[]),
  ]);

  const soon = quests.filter((q) => isStartingSoon(q.start_time));
  const rest = quests.filter((q) => !isStartingSoon(q.start_time));

  // People already committed are the strongest signal, so crews with a
  // roster sort ahead of empty ones within "forming".
  const forming = [...soon]
    .sort((a, b) => (b.participants?.length ?? 0) - (a.participants?.length ?? 0))
    .slice(0, 3);

  // Sections must not repeat a quest. "For You" and "Later tonight" draw
  // from overlapping pools, and the same card appearing twice on one screen
  // reads as a bug — which is exactly what it is.
  const shown = new Set(forming.map((q) => q.id));
  const forYou = recommended.filter((q) => !shown.has(q.id)).slice(0, 3);
  forYou.forEach((q) => shown.add(q.id));
  const later = [...soon.slice(3), ...rest].filter((q) => !shown.has(q.id));

  const peopleOut = new Set(
    quests.flatMap((q) => (q.participants ?? []).map((p) => p.user_id)),
  ).size;

  return (
    <AppShell unreadCount={badgeCount(notifications)}>
      <section>
        <h1 className="animate-rise-in text-display text-ink">
          {peopleOut > 0
            ? t("home.peopleOut", { count: peopleOut })
            : t("home.greeting")}
        </h1>
        <p className="mt-1 text-body-s text-ink-muted">
          {t("home.subline", { count: quests.length })}
        </p>
      </section>

      <section className="-mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} category={cat} label={t(`category.${cat}`)} />
          ))}
        </div>
      </section>

      {forming.length > 0 && (
        <Section title={t("home.crewsForming")}>
          <div className="flex flex-col gap-3">
            {forming.map((q, i) => (
              <Staggered key={q.id} index={i}>
                <QuestCard quest={q} />
              </Staggered>
            ))}
          </div>
        </Section>
      )}

      {forYou.length > 0 && (
        <Section title={t("home.sectionForYou")}>
          <div className="flex flex-col gap-3">
            {forYou.map((q, i) => (
              <Staggered key={q.id} index={i}>
                <QuestCard quest={q} />
              </Staggered>
            ))}
          </div>
        </Section>
      )}

      {later.length > 0 && (
        <Section title={t("home.laterTonight")}>
          <div className="flex flex-col gap-3">
            {later.map((q, i) => (
              <Staggered key={q.id} index={i}>
                <QuestCard quest={q} />
              </Staggered>
            ))}
          </div>
        </Section>
      )}

      {quests.length === 0 && recommended.length === 0 && (
        <EmptyState
          className="mt-6"
          icon={<Users className="h-7 w-7" />}
          title={t("home.nobodyYet")}
          body={t("home.beFirst")}
          action={{ label: t("createQuest.title"), href: "/quests/new" }}
        />
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      {/* Section labels are small black stickers — the feed's wayfinding. */}
      <h2 className="mb-3 inline-block -rotate-1 rounded-md border border-line bg-ink px-2 py-1 text-label uppercase text-surface">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Feed entrance: cards rise in one after another, 40ms apart, capped at 8
 * so a long list never makes the last card wait (spec §4.3).
 */
function Staggered({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div className="stagger animate-rise-in" style={{ "--i": index } as React.CSSProperties}>
      {children}
    </div>
  );
}
