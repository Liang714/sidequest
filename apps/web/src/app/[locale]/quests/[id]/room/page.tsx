import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestRoomClient } from "@/components/quest-room-client";
import { Link } from "@/i18n/navigation";
import { questById, questRoomMessages } from "@/lib/mock-data";

export default async function QuestRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quest = questById(id);
  if (!quest) notFound();

  const t = await getTranslations();

  return (
    <AppShell>
      <Link
        href={`/quests/${quest.id}`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted"
      >
        ← {t("common.back")}
      </Link>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{quest.title}</h1>
      <p className="mb-5 text-[13px] text-ink-faint">{t("questRoom.title")}</p>
      <QuestRoomClient quest={quest} initialMessages={questRoomMessages} />
    </AppShell>
  );
}
