import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { XpBar } from "@/components/xp-bar";
import { CategoryChip } from "@/components/category-chip";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { categoryShortKey, initialFromUsername } from "@/lib/format";
import type { Category } from "@/lib/types";
import type { AchievementOut, FriendOut, QuestSummaryOut, XpSummaryOut } from "@sidequest/types";

export default async function ProfilePage() {
  const session = await requireSession();
  const t = await getTranslations();

  const [xp, achievements, myQuests, friends] = await Promise.all([
    apiFetch<XpSummaryOut>("/users/me/xp"),
    apiFetch<AchievementOut[]>("/users/me/achievements"),
    apiFetch<QuestSummaryOut[]>("/quests/mine"),
    apiFetch<FriendOut[]>("/friends"),
  ]);

  const completedCount = myQuests.filter((q) => q.status === "completed").length;

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
          meta={t("profile.achievements", { count: achievements.length })}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile value={completedCount.toString()} label={t("profile.questsCompleted")} />
        <StatTile value={friends.length.toString()} label={t("nav.friends")} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
          {t("profile.achievements", { count: achievements.length })}
        </h2>
        {achievements.length === 0 ? (
          <p className="text-[13px] text-ink-faint">—</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <span
                key={a.key}
                className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
              >
                <span>{a.icon}</span>
                {t(a.key)}
              </span>
            ))}
          </div>
        )}
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
    </AppShell>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 text-center">
      <div className="font-mono text-[22px] font-medium text-ink">{value}</div>
      <div className="mt-1 text-[12px] text-ink-muted">{label}</div>
    </div>
  );
}
