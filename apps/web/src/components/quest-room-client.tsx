"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import clsx from "clsx";
import { AvatarStack } from "./avatar-stack";
import {
  checkinQuestAction,
  completeObjectiveAction,
  completeQuestAction,
} from "@/app/actions/quests";
import type { MessageOut, QuestOut } from "@sidequest/types";

interface LiveMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  createdAt: string;
}

export function QuestRoomClient({
  quest,
  initialMessages,
  accessToken,
  wsBaseUrl,
  currentUserId,
}: {
  quest: QuestOut;
  initialMessages: MessageOut[];
  accessToken: string;
  wsBaseUrl: string;
  currentUserId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState<LiveMessage[]>(
    initialMessages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderUsername: m.sender_username,
      content: m.content,
      createdAt: m.created_at,
    })),
  );
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${wsBaseUrl}/ws/quests/${quest.id}?token=${accessToken}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message.new") {
        const m = data.message;
        setMessages((prev) =>
          prev.some((existing) => existing.id === m.id)
            ? prev
            : [
                ...prev,
                {
                  id: m.id,
                  senderId: m.sender_id,
                  senderUsername: m.sender_username,
                  content: m.content,
                  createdAt: m.created_at,
                },
              ],
        );
      }
    };
    return () => ws.close();
  }, [quest.id, accessToken, wsBaseUrl]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    if (!draft.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message.send", content: draft.trim() }));
    setDraft("");
  };

  const myParticipation = quest.participants.find((p) => p.user_id === currentUserId);
  const checkedIn = myParticipation?.status === "checked_in" || myParticipation?.status === "completed";
  const alreadyCompleted = myParticipation?.status === "completed";
  const requiredDone = quest.objectives
    .filter((o) => o.is_required)
    .every((o) => o.completed_by_me);

  const runAction = (action: () => Promise<{ error?: string }>) => {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  };

  if (alreadyCompleted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-8 text-center">
        <span className="font-mono text-[32px] font-medium text-lime">
          {t("quest.xpReward", { xp: quest.xp_reward })}
        </span>
        <p className="text-[13px] text-ink-muted">{t("questRoom.archived")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <AvatarStack
            people={quest.participants
              .filter((p) => p.status !== "left")
              .map((p) => ({ id: p.user_id, username: p.username }))}
          />
          <button
            type="button"
            disabled={checkedIn || pending}
            onClick={() => runAction(() => checkinQuestAction(quest.id))}
            className={clsx(
              "rounded-button px-3.5 py-2 font-display text-[12.5px] font-semibold transition-colors disabled:opacity-70",
              checkedIn ? "bg-lime-soft text-lime" : "bg-blue text-white shadow-glow-blue",
            )}
          >
            {checkedIn ? `✓ ${t("questRoom.checkedIn")}` : t("questRoom.checkIn")}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          📍 {quest.location.address ?? quest.location.place_name ?? quest.location.city}
        </p>
        {!connected && <p className="mt-2 text-[11px] text-coral">{t("questRoom.reconnecting")}</p>}
      </div>

      <div>
        <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">
          {t("questRoom.objectivesTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {quest.objectives.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                disabled={o.completed_by_me || pending}
                onClick={() => runAction(() => completeObjectiveAction(quest.id, o.id))}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-button border px-3.5 py-2.5 text-left text-[13px] transition-colors disabled:cursor-default",
                  o.completed_by_me
                    ? "border-lime/40 bg-lime-soft text-ink"
                    : "border-line bg-surface text-ink-muted",
                )}
              >
                <span className={o.completed_by_me ? "text-lime" : "text-ink-faint"}>
                  {o.completed_by_me ? "☑" : "☐"}
                </span>
                <span className={o.completed_by_me ? "line-through decoration-ink-faint" : ""}>
                  {o.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-line bg-surface">
        <div ref={scrollRef} className="flex max-h-64 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={clsx("flex flex-col", mine && "items-end")}>
                <span className="text-[11px] text-ink-faint">
                  {m.senderUsername} ·{" "}
                  {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
                    new Date(m.createdAt),
                  )}
                </span>
                <span
                  className={clsx(
                    "mt-0.5 max-w-[80%] rounded-button px-3 py-1.5 text-[13px]",
                    mine ? "bg-blue text-white" : "bg-surface-elevated text-ink",
                  )}
                >
                  {m.content}
                </span>
              </div>
            );
          })}
        </div>
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("questRoom.chatPlaceholder")}
            className="flex-1 rounded-button border border-line bg-surface-elevated px-3.5 py-2.5 text-[13px] text-ink outline-none focus:border-blue"
          />
          <button
            type="submit"
            className="rounded-button bg-blue px-4 py-2.5 font-display text-[13px] font-semibold text-white"
          >
            {t("questRoom.send")}
          </button>
        </form>
      </div>

      {actionError && <p className="text-center text-[12px] text-coral">{actionError}</p>}

      <button
        type="button"
        disabled={!requiredDone || pending}
        onClick={() => runAction(() => completeQuestAction(quest.id))}
        className={clsx(
          "rounded-button py-3.5 font-display text-[14px] font-semibold transition-colors",
          requiredDone
            ? "bg-lime text-[#0B0B0F] shadow-glow-lime"
            : "cursor-not-allowed bg-surface-elevated text-ink-faint",
        )}
      >
        {t("questRoom.completeQuest")}
      </button>
    </div>
  );
}
