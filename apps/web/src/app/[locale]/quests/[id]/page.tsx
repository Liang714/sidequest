import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { AvatarStack } from "@/components/avatar-stack";
import { JoinQuestAction } from "@/components/join-quest-action";
import { Link } from "@/i18n/navigation";
import { questById } from "@/lib/mock-data";
import { categoryEmoji, difficultyStars } from "@/lib/types";

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quest = questById(id);
  if (!quest) notFound();

  const t = await getTranslations();
  const stars = "★".repeat(difficultyStars[quest.difficulty]) + "☆".repeat(4 - difficultyStars[quest.difficulty]);

  return (
    <AppShell>
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>

      <div
        className="flex h-40 items-start justify-between rounded-card p-5"
        style={{ background: quest.gradient }}
      >
        <span className="text-4xl">{categoryEmoji[quest.category]}</span>
        <span className="rounded-chip bg-black/35 px-2.5 py-1 font-mono text-[12px] text-white backdrop-blur-sm">
          {stars}
        </span>
      </div>

      <h1 className="mt-5 font-display text-[24px] font-bold leading-tight text-ink">
        {quest.title}
      </h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        {t("quest.createdBy", { name: quest.host.username })}
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{quest.description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
        <InfoRow icon="📍" label={quest.location} />
        <InfoRow icon="🕘" label={quest.startLabel} />
        <InfoRow icon="💰" label={quest.budgetLabel} />
        <InfoRow
          icon="👥"
          label={t("quest.participants", {
            joined: quest.joinedParticipants.length,
            max: quest.maxParticipants,
          })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-card border border-line bg-surface p-4">
        <AvatarStack users={quest.joinedParticipants} />
        <span className="font-mono text-[13px] font-medium text-lime">
          {t("quest.xpReward", { xp: quest.xpReward })}
        </span>
      </div>

      {quest.compatibility !== undefined && (
        <div className="mt-5 rounded-card border border-line bg-surface p-5">
          <CompatibilityBadge score={quest.compatibility} breakdown={quest.compatibilityBreakdown} />
        </div>
      )}

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
              <span className="text-ink-faint">☐</span>
              {o.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-1 font-display text-[13px] font-semibold text-ink">
          {t("quest.meetingPoint")}
        </h2>
        <p className="text-[13px] text-ink-muted">{quest.meetingPoint}</p>
      </div>

      <div className="sticky bottom-[72px] mt-6 pb-2">
        <JoinQuestAction questId={quest.id} />
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
