import { getLocale, getTranslations } from "next-intl/server";
import { TransitionLink, vtName } from "./motion/transition-link";
import { QuestCardView } from "./quest-card-view";
import { categoryShortKey, formatBudget, formatStartLabel } from "@/lib/format";
import { joinNames } from "@/lib/people";
import type { QuestSummaryOut } from "@sidequest/types";

/**
 * Feed card — spec §F1. Formats and translates, then hands off to
 * QuestCardView for the actual presentation, which the create flow's review
 * step also renders so a preview can't drift from the real thing.
 *
 * Motion: the card is `pressable-lg` (lifts on hover, pushes flat on press)
 * and carries a view-transition-name shared with the detail page's header,
 * so opening it morphs the card into that header (spec §4.2).
 */
export async function QuestCard({ quest }: { quest: QuestSummaryOut }) {
  const t = await getTranslations();
  const locale = await getLocale();

  const category = categoryShortKey(quest.category_key);
  const startLabel = formatStartLabel(quest.start_time, locale, (mins) =>
    t("quest.startsIn", { minutes: mins }),
  );
  const budgetLabel = formatBudget(quest.budget_amount, quest.currency, t("createQuest.budgetFree"));

  const people = (quest.participants ?? []).map((p) => ({
    id: p.user_id,
    name: p.display_name,
    avatarUrl: p.avatar_url,
  }));
  const spotsLeft = Math.max(0, quest.max_participants - quest.joined_count);
  const minutesToStart = (new Date(quest.start_time).getTime() - Date.now()) / 60000;

  return (
    <TransitionLink href={`/quests/${quest.id}`} className="group block rounded-card">
      <QuestCardView
        className="pressable-lg"
        style={{ viewTransitionName: vtName("quest", quest.id) }}
        category={category}
        categoryLabel={t(`category.${category}`)}
        meta={
          spotsLeft > 0 && quest.status === "open" ? (
            <span className="text-caption tabular-nums text-ink-faint">
              {t("quest.spotsLeft", { count: spotsLeft })}
            </span>
          ) : undefined
        }
        people={people}
        namesLine={people.length > 0 ? joinNames(people.map((p) => p.name), locale) : undefined}
        needLine={
          spotsLeft > 0
            ? t(people.length === 1 ? "quest.lookingForMoreOne" : "quest.lookingForMoreMany", {
                count: spotsLeft,
              })
            : t("quest.crewFull")
        }
        title={quest.title}
        place={quest.location_city}
        budgetLabel={budgetLabel}
        distanceLabel={quest.distance_km != null ? `${quest.distance_km} km` : null}
        startLabel={startLabel}
        xpLabel={t("quest.xpReward", { xp: quest.xp_reward })}
        urgent={minutesToStart > 0 && minutesToStart <= 60}
      />
    </TransitionLink>
  );
}
