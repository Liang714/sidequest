import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { AvatarStack } from "@/components/avatar-stack";
import { CategoryChip } from "@/components/category-chip";
import { Link } from "@/i18n/navigation";
import { quests, users } from "@/lib/mock-data";
import type { Category } from "@/lib/types";

const FILTER_CATEGORIES: Category[] = ["gaming", "photography", "dance", "cafe", "food", "art"];

export default async function HomePage() {
  const t = await getTranslations();

  const now = quests.filter((q) => q.startsInMinutes !== undefined);
  const nearYou = quests.filter((q) => q.startsInMinutes === undefined).slice(0, 4);
  const sponsored = quests.filter((q) => q.sponsored);

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
          {FILTER_CATEGORIES.map((cat, i) => (
            <CategoryChip key={cat} category={cat} label={t(`category.${cat}`)} selected={i === 0} />
          ))}
        </div>
      </section>

      {now.length > 0 && (
        <SectionHeading title={t("home.sectionNow")} seeAll={t("home.seeAll")} />
      )}
      {now.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {now.map((q) => (
            <QuestCard key={q.id} quest={q} variant="row" />
          ))}
        </div>
      )}

      <SectionHeading title={t("home.sectionNear")} seeAll={t("home.seeAll")} />
      <div className="grid grid-cols-2 gap-3">
        {nearYou.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>

      <SectionHeading title={t("home.sectionFriends")} />
      <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
        <AvatarStack users={[users.alex, users.jamie]} max={3} />
        <p className="text-[13px] text-ink-muted">
          {t.rich("home.friendJoined", {
            names: "Alex, Jamie",
            quest: quests[0]!.title,
            link: (chunks) => (
              <Link
                href={`/quests/${quests[0]!.id}`}
                className="font-medium text-ink underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>

      {sponsored.length > 0 && (
        <>
          <SectionHeading title={t("home.sectionSponsored")} />
          <div className="grid grid-cols-1 gap-3">
            {sponsored.map((q) => (
              <QuestCard key={q.id} quest={q} variant="row" />
            ))}
          </div>
        </>
      )}

      <SectionHeading title={t("home.sectionTrending")} />
      <div className="grid grid-cols-2 gap-3 pb-2">
        {quests.slice(0, 4).map((q) => (
          <QuestCard key={`trend-${q.id}`} quest={q} />
        ))}
      </div>
    </AppShell>
  );
}

function SectionHeading({ title, seeAll }: { title: string; seeAll?: string }) {
  return (
    <div className="mb-3 mt-7 flex items-baseline justify-between">
      <h2 className="font-display text-[16px] font-semibold text-ink">{title}</h2>
      {seeAll && <span className="text-[12px] text-ink-faint">{seeAll}</span>}
    </div>
  );
}
