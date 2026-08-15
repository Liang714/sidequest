import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Quest } from "@/lib/types";
import { categoryEmoji, difficultyStars } from "@/lib/types";
import clsx from "clsx";

export async function QuestCard({
  quest,
  variant = "grid",
}: {
  quest: Quest;
  variant?: "grid" | "row";
}) {
  const t = await getTranslations();
  const stars = "★".repeat(difficultyStars[quest.difficulty]);

  return (
    <Link
      href={`/quests/${quest.id}`}
      className={clsx(
        "group block overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-blue/40",
        variant === "row" && "flex",
      )}
    >
      <div
        className={clsx(
          "relative flex items-start justify-between p-3",
          variant === "grid" ? "h-28" : "h-auto w-24 flex-none items-center justify-center",
        )}
        style={{ background: quest.gradient }}
      >
        <span className={clsx(variant === "grid" ? "text-2xl" : "text-xl")}>
          {categoryEmoji[quest.category]}
        </span>
        {variant === "grid" && (
          <span className="rounded-chip bg-black/35 px-2 py-1 font-mono text-[11px] text-white backdrop-blur-sm">
            {stars}
          </span>
        )}
      </div>
      <div className={clsx("flex flex-1 flex-col p-4", variant === "row" && "gap-1 p-3")}>
        {quest.sponsored && (
          <span className="mb-1 w-fit rounded-chip bg-violet-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-violet">
            {t("home.sectionSponsored")}
          </span>
        )}
        <div className="font-display text-[15px] font-semibold leading-snug text-ink">
          {quest.title}
        </div>
        <div
          className={clsx(
            "mt-2 flex text-[13px] text-ink-muted",
            variant === "grid" ? "flex-col gap-1" : "flex-wrap gap-x-3 gap-y-0.5",
          )}
        >
          <span>📍 {quest.location}</span>
          <span>🕘 {quest.startLabel}</span>
          <span>💰 {quest.budgetLabel}</span>
          <span>
            👥 {t("quest.participants", { joined: quest.joinedParticipants.length, max: quest.maxParticipants })}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[13px] font-medium text-lime">
            {t("quest.xpReward", { xp: quest.xpReward })}
          </span>
          {variant === "grid" && (
            <span className="rounded-button bg-blue px-4 py-2 font-display text-[12.5px] font-semibold text-white shadow-glow-blue transition-transform group-hover:scale-[1.03]">
              {t("quest.joinQuest")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
