import { getLocale, getTranslations } from "next-intl/server";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { FaceStack, Badge } from "@/components/ui";
import { CategoryIcon } from "./category-icon";
import { categoryShortKey, formatBudget, formatStartLabel } from "@/lib/format";
import { joinNames } from "@/lib/people";
import type { QuestSummaryOut } from "@sidequest/types";

/**
 * CREW quest card — spec §F1.
 *
 * Hierarchy inverts the pre-rebuild card, which led with a category emoji
 * on a colour gradient: ① faces ② names ③ activity ④ meta. "Minji, Tae and
 * Sora are looking for 2 more" is at once the invitation, the social proof
 * and the urgency, which is why time sits in the meta line rather than
 * getting a headline. Social pressure is truer to this product than numeric
 * pressure and it can't be inflated into FOMO.
 *
 * Falls back to an activity-led layout when nobody has joined yet — a card
 * with no faces shouldn't pretend to have a crew.
 *
 * The pre-rebuild card had grid/row variants that differed only in where
 * the gradient block sat. CREW has one layout, so the prop is gone rather
 * than kept as a no-op.
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
  const urgent = minutesToStart > 0 && minutesToStart <= 60;

  return (
    <Link
      href={`/quests/${quest.id}`}
      className={clsx(
        "group block rounded-card border border-line bg-surface p-4 shadow-e1",
        "transition-transform duration-150 ease-crew hover:-translate-y-0.5",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge tone="neutral" icon={<CategoryIcon category={category} className="h-3 w-3" />}>
          {t(`category.${category}`)}
        </Badge>
        {spotsLeft > 0 && quest.status === "open" && (
          <span className="text-caption tabular-nums text-ink-faint">
            {t("quest.spotsLeft", { count: spotsLeft })}
          </span>
        )}
      </div>

      {people.length > 0 ? (
        <>
          {/* ① faces, ② names — the headline */}
          <FaceStack people={people} ringClassName="border-surface" />
          <p className="mt-3 text-h2 text-ink">
            {joinNames(
              people.map((p) => p.name),
              locale,
            )}
          </p>
          <p className="text-body-s text-ink-muted">
            {spotsLeft > 0
              ? t(
                  people.length === 1 ? "quest.lookingForMoreOne" : "quest.lookingForMoreMany",
                  { count: spotsLeft },
                )
              : t("quest.crewFull")}
          </p>
          {/* ③ the activity, second */}
          <p className="mt-3 text-body-s text-ink">{quest.title}</p>
        </>
      ) : (
        // Nobody's in yet — lead with the activity rather than fake a crew.
        <p className="text-h2 text-ink">{quest.title}</p>
      )}

      <p className="mt-1 text-caption text-ink-muted">
        {quest.location_city} · {budgetLabel}
        {quest.distance_km != null && ` · ${quest.distance_km} km`}
      </p>

      {/* ④ time as a datum, never the headline */}
      <p
        className={clsx(
          "mt-2 text-numeric tabular-nums",
          urgent ? "text-danger-text" : "text-ink-muted",
        )}
      >
        {startLabel}
        <span className="ml-2 font-normal text-mint-text">
          {t("quest.xpReward", { xp: quest.xp_reward })}
        </span>
      </p>
    </Link>
  );
}
