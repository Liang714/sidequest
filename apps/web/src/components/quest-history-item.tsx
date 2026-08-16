import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryEmoji } from "@/lib/types";
import { categoryShortKey, formatQuestDate } from "@/lib/format";
import type { QuestSummaryOut } from "@sidequest/types";

/** A compact past-tense row for the profile page's quest history — deliberately
 * separate from QuestCard, whose "starts in Xmin" framing and join CTA are
 * built for discovery, not looking back at something already completed. */
export async function QuestHistoryItem({ quest }: { quest: QuestSummaryOut }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const category = categoryShortKey(quest.category_key);

  return (
    <Link
      href={`/quests/${quest.id}`}
      className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition-colors hover:border-blue/40"
    >
      <span className="text-xl">{categoryEmoji[category] ?? "✨"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[13.5px] font-medium text-ink">{quest.title}</div>
        <div className="text-[12px] text-ink-muted">{formatQuestDate(quest.start_time, locale)}</div>
      </div>
      <span className="flex-none font-mono text-[12.5px] font-medium text-lime">
        {t("quest.xpReward", { xp: quest.xp_reward })}
      </span>
    </Link>
  );
}
