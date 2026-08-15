import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { myQuests } from "@/lib/mock-data";

export default async function MyQuestsPage() {
  const t = await getTranslations();

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("nav.quests")}</h1>
      <div className="flex flex-col gap-3">
        {myQuests.map((q) => (
          <QuestCard key={q.id} quest={q} variant="row" />
        ))}
      </div>
    </AppShell>
  );
}
