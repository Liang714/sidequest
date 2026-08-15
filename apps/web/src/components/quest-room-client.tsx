"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatMessage, Quest, QuestObjective } from "@/lib/types";
import { currentUser } from "@/lib/mock-data";
import { AvatarStack } from "./avatar-stack";
import clsx from "clsx";

export function QuestRoomClient({
  quest,
  initialMessages,
}: {
  quest: Quest;
  initialMessages: ChatMessage[];
}) {
  const t = useTranslations();
  const [objectives, setObjectives] = useState<QuestObjective[]>(quest.objectives);
  const [checkedIn, setCheckedIn] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [completed, setCompleted] = useState(false);

  // quest.joinedParticipants may or may not already include the current
  // user depending on the mock quest (mirrors real data: a user can view a
  // room for a quest they joined before this session) — dedupe by id
  // rather than assuming either shape.
  const roomParticipants = quest.joinedParticipants.some((p) => p.id === currentUser.id)
    ? quest.joinedParticipants
    : [currentUser, ...quest.joinedParticipants];

  const toggleObjective = (id: string) =>
    setObjectives((prev) => prev.map((o) => (o.id === id ? { ...o, completed: !o.completed } : o)));

  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}`,
        sender: currentUser,
        content: draft.trim(),
        timeLabel: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
    setDraft("");
  };

  const allDone = objectives.every((o) => o.completed);

  if (completed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-8 text-center">
        <span className="font-mono text-[32px] font-medium text-lime">
          {t("quest.xpReward", { xp: quest.xpReward })}
        </span>
        <p className="text-[13px] text-ink-muted">{t("questRoom.archived")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <AvatarStack users={roomParticipants} />
          <button
            type="button"
            onClick={() => setCheckedIn((v) => !v)}
            className={clsx(
              "rounded-button px-3.5 py-2 font-display text-[12.5px] font-semibold transition-colors",
              checkedIn ? "bg-lime-soft text-lime" : "bg-blue text-white shadow-glow-blue",
            )}
          >
            {checkedIn ? `✓ ${t("questRoom.checkedIn")}` : t("questRoom.checkIn")}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          📍 {quest.meetingPoint} · 🕘 {quest.startLabel}
        </p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">
          {t("questRoom.objectivesTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {objectives.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => toggleObjective(o.id)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-button border px-3.5 py-2.5 text-left text-[13px] transition-colors",
                  o.completed
                    ? "border-lime/40 bg-lime-soft text-ink"
                    : "border-line bg-surface text-ink-muted",
                )}
              >
                <span className={o.completed ? "text-lime" : "text-ink-faint"}>
                  {o.completed ? "☑" : "☐"}
                </span>
                <span className={o.completed ? "line-through decoration-ink-faint" : ""}>{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-line bg-surface">
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((m) => {
            const mine = m.sender.id === currentUser.id;
            return (
              <div key={m.id} className={clsx("flex flex-col", mine && "items-end")}>
                <span className="text-[11px] text-ink-faint">
                  {m.sender.username} · {m.timeLabel}
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

      <button
        type="button"
        disabled={!allDone}
        onClick={() => setCompleted(true)}
        className={clsx(
          "rounded-button py-3.5 font-display text-[14px] font-semibold transition-colors",
          allDone ? "bg-lime text-[#0B0B0F] shadow-glow-lime" : "cursor-not-allowed bg-surface-elevated text-ink-faint",
        )}
      >
        {t("questRoom.completeQuest")}
      </button>
    </div>
  );
}
