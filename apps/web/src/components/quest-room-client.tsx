"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import clsx from "clsx";
import { Camera, Check, MapPin, Send, Sparkles } from "lucide-react";
import { Button, ChatBubble, CheckInStrip } from "@/components/ui";
import {
  checkinQuestAction,
  completeObjectiveAction,
  completeQuestAction,
  verifyPhotoObjectiveAction,
} from "@/app/actions/quests";
import type { AchievementOut, MessageOut, ObjectiveOut, QuestOut, VisionVerificationOut } from "@sidequest/types";

interface CompletionResult {
  xpAwarded: number;
  newLevel: number | null;
  newAchievements: AchievementOut[];
}

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
  apiOrigin,
  currentUserId,
}: {
  quest: QuestOut;
  initialMessages: MessageOut[];
  accessToken: string;
  wsBaseUrl: string;
  apiOrigin: string;
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
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
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

  const handleCompleteQuest = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await completeQuestAction(quest.id);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setCompletionResult({
        xpAwarded: result.xpAwarded ?? 0,
        newLevel: result.newLevel ?? null,
        newAchievements: result.newAchievements ?? [],
      });
      router.refresh();
    });
  };

  if (alreadyCompleted) {
    // completionResult only exists right after *this* client completed the
    // quest in this session — a fresh visit to an already-archived room
    // falls back to the quest's flat xp_reward, same as before this feature.
    const xp = completionResult?.xpAwarded ?? quest.xp_reward;
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-8 text-center shadow-e1">
        <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-mint">
          <Check aria-hidden className="h-7 w-7 text-on-mint" strokeWidth={3} />
        </span>
        <p className="text-display text-ink">{t("questRoom.questComplete")}</p>
        <span className="text-[40px] font-extrabold tabular-nums leading-none text-mint-text">
          {t("quest.xpReward", { xp })}
        </span>
        {completionResult?.newLevel != null && (
          <p className="text-h3 text-ink">
            {t("questRoom.leveledUp", { level: completionResult.newLevel })}
          </p>
        )}
        {completionResult && completionResult.newAchievements.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-label uppercase text-ink-faint">{t("questRoom.newAchievements")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {completionResult.newAchievements.map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center gap-1.5 rounded-chip border border-mint-soft bg-mint-soft px-3 py-1.5 text-caption font-bold text-mint-text"
                >
                  {t(a.key)}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-body-s text-ink-muted">{t("questRoom.archived")}</p>
      </div>
    );
  }

  const going = quest.participants.filter((p) => p.status !== "left");
  const hereCount = going.filter(
    (p) => p.status === "checked_in" || p.status === "completed",
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Check-in sits above the chat: "are the others actually coming?" is
          the highest-anxiety question in the product (spec §F4). */}
      <div>
        <CheckInStrip
          people={going.map((p) => ({
            id: p.user_id,
            name: p.username,
            checkedIn: p.status === "checked_in" || p.status === "completed",
          }))}
          countLabel={t("questRoom.hereCount", { count: hereCount, total: going.length })}
          canCheckIn={!checkedIn}
          checkInLabel={t("questRoom.checkIn")}
          loading={pending}
          onCheckIn={() => runAction(() => checkinQuestAction(quest.id))}
        />
        <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-muted">
          <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {quest.location.address ?? quest.location.place_name ?? quest.location.city}
        </p>
        {!connected && (
          <p role="status" className="mt-2 text-caption text-warn-text">
            {t("questRoom.reconnecting")}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-label uppercase text-ink-faint">
          {t("questRoom.objectivesTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {quest.objectives.map((o) =>
            o.verification_type === "photo" ? (
              <PhotoObjectiveItem
                key={o.id}
                questId={quest.id}
                objective={o}
                apiOrigin={apiOrigin}
                onVerified={() => router.refresh()}
              />
            ) : (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={o.completed_by_me || pending}
                  onClick={() => runAction(() => completeObjectiveAction(quest.id, o.id))}
                  className={clsx(
                    "flex min-h-11 w-full items-center gap-3 rounded-button border px-4 py-3 text-left text-body-s",
                    "transition-colors duration-150 ease-crew disabled:cursor-default",
                    o.completed_by_me
                      ? "border-mint-soft bg-mint-soft text-ink"
                      : "border-line bg-surface text-ink-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill border",
                      o.completed_by_me ? "border-mint bg-mint" : "border-line",
                    )}
                  >
                    {o.completed_by_me && (
                      <Check aria-hidden className="h-3 w-3 text-on-mint" strokeWidth={3} />
                    )}
                  </span>
                  {o.description}
                </button>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="rounded-card border border-line bg-surface shadow-e1">
        <div ref={scrollRef} className="flex max-h-72 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            return (
              <ChatBubble
                key={m.id}
                kind={m.senderId === currentUserId ? "mine" : "theirs"}
                text={m.content}
                senderName={m.senderUsername}
                senderId={m.senderId}
                grouped={prev?.senderId === m.senderId}
              />
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
            aria-label={t("questRoom.chatPlaceholder")}
            className="min-h-11 flex-1 rounded-pill border border-line bg-surface-elevated px-4 text-body-s text-ink outline-none focus:border-hot"
          />
          <Button type="submit" size="sm" aria-label={t("questRoom.send")}>
            <Send aria-hidden className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {actionError && (
        <p role="alert" className="text-center text-caption text-danger-text">
          {actionError}
        </p>
      )}

      <Button block size="lg" disabled={!requiredDone || pending} onClick={handleCompleteQuest}>
        {t("questRoom.completeQuest")}
      </Button>
    </div>
  );
}

function PhotoObjectiveItem({
  questId,
  objective,
  apiOrigin,
  onVerified,
}: {
  questId: string;
  objective: ObjectiveOut;
  apiOrigin: string;
  onVerified: () => void;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [aiResult, setAiResult] = useState<VisionVerificationOut | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const [header, base64] = dataUrl.split(",");
      const contentType = header?.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
      if (!base64) return;
      startTransition(async () => {
        const res = await verifyPhotoObjectiveAction(questId, objective.id, base64, contentType);
        if (res.error) {
          setError(res.error);
          return;
        }
        setAiResult(res.result?.ai_verification ?? null);
        setPhotoUrl(res.result?.photo_url ?? null);
        onVerified();
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <li className="rounded-button border border-line bg-surface px-4 py-3">
      <div
        className={clsx(
          "flex items-center gap-3 text-body-s",
          objective.completed_by_me ? "text-ink" : "text-ink-muted",
        )}
      >
        <span
          className={clsx(
            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill border",
            objective.completed_by_me ? "border-mint bg-mint" : "border-line",
          )}
        >
          {objective.completed_by_me && (
            <Check aria-hidden className="h-3 w-3 text-on-mint" strokeWidth={3} />
          )}
        </span>
        <span>{objective.description}</span>
        <span className="ml-auto flex flex-none items-center gap-1 rounded-chip bg-info-soft px-2 py-0.5 text-label uppercase text-info-text">
          <Camera aria-hidden className="h-3 w-3" />
          {t("questRoom.photoObjective")}
        </span>
      </div>

      {!objective.completed_by_me && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            block
            className="mt-3"
            loading={pending}
            onClick={() => fileInputRef.current?.click()}
            icon={<Camera className="h-4 w-4" />}
          >
            {t("questRoom.uploadPhoto")}
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-caption text-danger-text">
          {error}
        </p>
      )}
      {photoUrl && (
        // Small user-uploaded thumbnail from our own API origin — not a
        // case next/image's remote-domain optimization pipeline is worth
        // configuring for.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${apiOrigin}${photoUrl}`}
          alt={objective.description}
          className="mt-2 h-32 w-full rounded-button object-cover"
        />
      )}
      {aiResult && (
        // Advisory only, and styled to say so. Vision verification measured
        // 58% correct / 25% false-negative (docs/AI.md), which is why it
        // never gates completion — the objective is already done above.
        // Rendering a "no match" in a failure colour would imply otherwise.
        <div className="mt-2 rounded-r-lg border-l-2 border-info bg-info-soft px-3 py-2">
          <p className="flex items-center gap-1.5 text-label uppercase text-info-text">
            <Sparkles aria-hidden className="h-3 w-3" />
            {t("questRoom.aiAdvisory")}
          </p>
          <p className="mt-1 text-caption text-ink-muted">
            {aiResult.matches ? t("questRoom.aiConfirms") : t("questRoom.aiUnsure")} —{" "}
            {aiResult.explanation}
          </p>
        </div>
      )}
    </li>
  );
}
