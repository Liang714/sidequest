import { getTranslations } from "next-intl/server";
import {
  Building2,
  ChevronRight,
  Flag,
  Map as MapIcon,
  Palette,
  Route,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Ticket,
  Users2,
} from "lucide-react";
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

      {/*
        The "You" hub. These routes were previously a flat list of emoji
        links; /friends and /map had no entry here at all, and /map had zero
        inbound links anywhere in the app. Grouped, Lucide-iconed, and
        role-gated so complexity is earned rather than paid up front
        (spec §D, §L principle 8).
      */}
      <nav aria-label={t("hub.title")} className="mt-6 flex flex-col gap-2">
        <HubLink href="/friends" icon={<Users2 className="h-[18px] w-[18px]" />} label={t("hub.friends")} />
        <HubLink href="/map" icon={<MapIcon className="h-[18px] w-[18px]" />} label={t("nav.map")} />
        <HubLink href="/plan" icon={<Route className="h-[18px] w-[18px]" />} label={t("itinerary.navLink")} />
        <HubLink href="/bookings" icon={<Ticket className="h-[18px] w-[18px]" />} label={t("booking.myBookings")} />
        <HubLink href="/marketplace" icon={<Store className="h-[18px] w-[18px]" />} label={t("marketplace.navLink")} />
        <HubLink href="/subscription" icon={<Star className="h-[18px] w-[18px]" />} label={t("subscription.navLink")} />
        <HubLink href="/creator" icon={<Palette className="h-[18px] w-[18px]" />} label={t("creator.dashboardLink")} />
        <HubLink href="/business" icon={<Building2 className="h-[18px] w-[18px]" />} label={t("business.dashboardLink")} />
        <HubLink href="/settings" icon={<Settings className="h-[18px] w-[18px]" />} label={t("settings.navLink")} />
        {session.is_admin && (
          <>
            <HubLink href="/admin/businesses" icon={<ShieldCheck className="h-[18px] w-[18px]" />} label={t("admin.pendingBusinesses")} />
            <HubLink href="/admin/reports" icon={<Flag className="h-[18px] w-[18px]" />} label={t("admin.reportsNavLink")} />
          </>
        )}
      </nav>
    </AppShell>
  );
}

function HubLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-body-s font-medium text-ink transition-colors duration-150 ease-crew hover:bg-surface-elevated"
    >
      <span className="text-ink-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight aria-hidden className="h-4 w-4 text-ink-faint" />
    </Link>
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
