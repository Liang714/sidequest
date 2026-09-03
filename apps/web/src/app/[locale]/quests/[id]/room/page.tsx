import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { QuestRoomClient } from "@/components/quest-room-client";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { getAccessToken } from "@/lib/session";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { MessageOut, QuestOut } from "@sidequest/types";

export default async function QuestRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  let quest: QuestOut;
  let messages: MessageOut[];
  try {
    [quest, messages] = await Promise.all([
      apiFetch<QuestOut>(`/quests/${id}`),
      apiFetch<MessageOut[]>(`/quests/${id}/messages`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  // The access token is passed to a client component here so it can open
  // an authenticated WebSocket — the one deliberate exception to "tokens
  // never leave httpOnly cookies," scoped to this one page load. See the
  // note in lib/session.ts.
  const accessToken = (await getAccessToken())!;
  const t = await getTranslations();

  return (
    <AppShell>
      <Link
        href={`/quests/${quest.id}`}
        className="inline-flex min-h-11 items-center gap-1 text-body-s text-ink-muted"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("common.back")}
      </Link>
      <h1 className="mt-2 text-h1 text-ink">{quest.title}</h1>
      <p className="mb-5 text-body-s text-ink-faint">{t("questRoom.title")}</p>
      <QuestRoomClient
        quest={quest}
        initialMessages={messages}
        accessToken={accessToken}
        wsBaseUrl={process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/api/v1"}
        apiOrigin={process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000"}
        currentUserId={session.user_id}
      />
    </AppShell>
  );
}
