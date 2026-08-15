import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { XpBar } from "@/components/xp-bar";
import { CategoryChip } from "@/components/category-chip";
import { currentUser, currentUserAchievements, friendsList, myQuests } from "@/lib/mock-data";
import type { Category } from "@/lib/types";

const FAVORITE_CATEGORIES: Category[] = ["gaming", "dance", "photography", "cafe"];

export default async function ProfilePage() {
  const t = await getTranslations();

  return (
    <AppShell>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue font-display text-[22px] font-bold text-white shadow-glow-blue">
          {currentUser.avatarInitial}
        </div>
        <div>
          <h1 className="font-display text-[20px] font-bold text-ink">{currentUser.username}</h1>
          <p className="text-[13px] text-ink-muted">{t("profile.realNameHidden")}</p>
        </div>
      </div>

      <div className="mt-5">
        <XpBar
          level={currentUser.level}
          levelTitle="Urban Explorer"
          currentXp={2840}
          nextLevelXp={3500}
          meta={t("profile.achievements", { count: currentUserAchievements.length })}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile value={myQuests.length.toString()} label={t("profile.questsCompleted")} />
        <StatTile value={friendsList.length.toString()} label={t("nav.friends")} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
          {t("profile.achievements", { count: currentUserAchievements.length })}
        </h2>
        <div className="flex flex-wrap gap-2">
          {currentUserAchievements.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface px-3 py-1.5 text-[13px] text-ink"
            >
              <span>{a.emoji}</span>
              {t(a.labelKey)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
          {t("profile.favoriteCategories")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {FAVORITE_CATEGORIES.map((c) => (
            <CategoryChip key={c} category={c} label={t(`category.${c}`)} />
          ))}
        </div>
      </div>
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
