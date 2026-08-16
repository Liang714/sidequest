import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { AvatarStack } from "@/components/avatar-stack";
import { JoinQuestAction } from "@/components/join-quest-action";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { categoryEmoji, difficultyStars } from "@/lib/types";
import { categoryShortKey, formatBudget, formatStartLabel, gradientForCategory } from "@/lib/format";
import type { QuestOut } from "@sidequest/types";

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  let quest: QuestOut;
  try {
    quest = await apiFetch<QuestOut>(`/quests/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const t = await getTranslations();
  const locale = await getLocale();
  const category = categoryShortKey(quest.category_key);
  const stars =
    "★".repeat(difficultyStars[quest.difficulty]) + "☆".repeat(4 - difficultyStars[quest.difficulty]);
  const startLabel = formatStartLabel(quest.start_time, locale, (mins) => t("quest.startsIn", { minutes: mins }));
  const budgetLabel = formatBudget(quest.budget_amount, quest.currency, t("createQuest.budgetFree"));

  const myParticipation = quest.participants.find((p) => p.user_id === session.user_id);
  const alreadyJoined = !!myParticipation && myParticipation.status !== "left";
  const creator = quest.participants.find((p) => p.user_id === quest.creator_id);

  return (
    <AppShell>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>

      <div
        className="flex h-40 items-start justify-between rounded-card p-5"
        style={{ background: gradientForCategory(quest.category_key) }}
      >
        <span className="text-4xl">{categoryEmoji[category] ?? "✨"}</span>
        <span className="rounded-chip bg-black/35 px-2.5 py-1 font-mono text-[12px] text-white backdrop-blur-sm">
          {stars}
        </span>
      </div>

      <h1 className="mt-5 font-display text-[24px] font-bold leading-tight text-ink">
        {quest.title}
      </h1>
      {creator && (
        <p className="mt-1 text-[13px] text-ink-muted">
          {t("quest.createdBy", { name: creator.username })}
        </p>
      )}
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{quest.description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
        <InfoRow icon="📍" label={quest.location.place_name ?? quest.location.city} />
        <InfoRow icon="🕘" label={startLabel} />
        <InfoRow icon="💰" label={budgetLabel} />
        <InfoRow
          icon="👥"
          label={t("quest.participants", { joined: quest.joined_count, max: quest.max_participants })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-card border border-line bg-surface p-4">
        <AvatarStack
          people={quest.participants
            .filter((p) => p.status !== "left")
            .map((p) => ({ id: p.user_id, username: p.username }))}
        />
        <span className="font-mono text-[13px] font-medium text-lime">
          {t("quest.xpReward", { xp: quest.xp_reward })}
        </span>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">
          {t("quest.objectives")}
        </h2>
        <ul className="flex flex-col gap-2">
          {quest.objectives.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-2.5 rounded-button border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink-muted"
            >
              <span className="text-ink-faint">{o.completed_by_me ? "☑" : "☐"}</span>
              {o.description}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-1 font-display text-[13px] font-semibold text-ink">
          {t("quest.meetingPoint")}
        </h2>
        <p className="text-[13px] text-ink-muted">
          {quest.location.address ?? quest.location.place_name ?? quest.location.city}
        </p>
      </div>

      <div className="mt-6 pb-2">
        <JoinQuestAction questId={quest.id} joined={alreadyJoined} />
      </div>
    </AppShell>
  );
}

function InfoRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-button border border-line bg-surface px-3 py-2.5 text-ink-muted">
      <span>{icon}</span>
      {label}
    </div>
  );
}
