import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { QuestSummaryOut } from "@sidequest/types";

export default async function MyQuestsPage() {
  await requireSession();
  const t = await getTranslations();
  const quests = await apiFetch<QuestSummaryOut[]>("/quests/mine");

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("nav.quests")}</h1>
      {quests.length === 0 ? (
        <p className="text-[13px] text-ink-muted">{t("home.emptyNearby")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {quests.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
