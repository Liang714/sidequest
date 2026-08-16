import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { XpBar } from "@/components/xp-bar";
import { CategoryChip } from "@/components/category-chip";
import { QuestHistoryItem } from "@/components/quest-history-item";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { categoryShortKey, initialFromUsername } from "@/lib/format";
import type { Category } from "@/lib/types";
import type { AchievementOut, FriendOut, QuestSummaryOut, XpSummaryOut } from "@sidequest/types";
import clsx from "clsx";

const HISTORY_PREVIEW_SIZE = 5;

export default async function ProfilePage() {
  const session = await requireSession();
  const t = await getTranslations();

  const [xp, achievements, myQuests, friends] = await Promise.all([
    apiFetch<XpSummaryOut>("/users/me/xp"),
    apiFetch<AchievementOut[]>("/users/me/achievements"),
    apiFetch<QuestSummaryOut[]>("/quests/mine"),
    apiFetch<FriendOut[]>("/friends"),
  ]);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  const completedQuests = myQuests
    .filter((q) => q.status === "completed")
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const categoryCounts = new Map<string, number>();
  for (const q of myQuests) {
    const key = categoryShortKey(q.category_key);
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const favoriteCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key);

  return (
    <AppShell>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue font-display text-[22px] font-bold text-white shadow-glow-blue">
          {initialFromUsername(session.username)}
        </div>
        <div>
          <h1 className="font-display text-[20px] font-bold text-ink">{session.username}</h1>
          <p className="text-[13px] text-ink-muted">{t("profile.realNameHidden")}</p>
        </div>
      </div>

      <div className="mt-5">
        <XpBar
          level={xp.level}
          levelTitle={t("profile.level", { level: xp.level })}
          currentXp={xp.xp_into_level}
          nextLevelXp={xp.xp_for_next_level}
          meta={t("profile.achievementsProgress", {
            unlocked: unlockedAchievements.length,
            total: achievements.length,
          })}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatTile value={completedQuests.length.toString()} label={t("profile.questsCompleted")} />
        <StatTile value={friends.length.toString()} label={t("nav.friends")} />
        <StatTile
          value={`${unlockedAchievements.length}/${achievements.length}`}
          label={t("profile.achievements")}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("profile.achievements")}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={clsx(
                "flex items-center gap-2 rounded-chip border px-3 py-2 text-[12.5px]",
                a.unlocked
                  ? "border-lime/40 bg-lime-soft text-ink"
                  : "border-line bg-surface text-ink-faint opacity-60",
              )}
            >
              <span className={a.unlocked ? "" : "grayscale"}>{a.icon}</span>
              <span className="truncate">{t(a.key)}</span>
              {!a.unlocked && <span className="ml-auto flex-none text-[11px]">🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {favoriteCategories.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
            {t("profile.favoriteCategories")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {favoriteCategories.map((c) => (
              <CategoryChip key={c} category={c as Category} label={t(`category.${c}`)} />
            ))}
          </div>
        </div>
      )}

      {completedQuests.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[14px] font-semibold text-ink">{t("profile.questHistory")}</h2>
            {completedQuests.length > HISTORY_PREVIEW_SIZE && (
              <Link href="/quests" className="text-[12.5px] font-medium text-blue">
                {t("profile.seeAll")}
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {completedQuests.slice(0, HISTORY_PREVIEW_SIZE).map((q) => (
              <QuestHistoryItem key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/business"
          className="rounded-card border border-line bg-surface px-4 py-3 text-[13px] font-medium text-ink transition-colors hover:border-violet/40"
        >
          🏢 {t("business.dashboardLink")}
        </Link>
        {session.is_admin && (
          <Link
            href="/admin/businesses"
            className="rounded-card border border-line bg-surface px-4 py-3 text-[13px] font-medium text-ink transition-colors hover:border-blue/40"
          >
            🛡️ {t("admin.pendingBusinesses")}
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 text-center">
      <div className="font-mono text-[18px] font-medium text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-ink-muted">{label}</div>
    </div>
  );
}
