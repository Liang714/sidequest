import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CreatorRegisterForm } from "@/components/creator-register-form";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { categoryEmoji } from "@/lib/types";
import { categoryShortKey, formatBudget } from "@/lib/format";
import type { CreatorOut, MarketplaceQuestOut } from "@sidequest/types";

export default async function CreatorDashboardPage() {
  await requireSession();
  const t = await getTranslations();

  let creator: CreatorOut | null = null;
  try {
    creator = await apiFetch<CreatorOut>("/creators/me");
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }

  if (!creator) {
    return (
      <AppShell>
        <h1 className="mb-2 font-display text-[20px] font-bold text-ink">{t("creator.title")}</h1>
        <CreatorRegisterForm />
      </AppShell>
    );
  }

  const allMarketplaceQuests = await apiFetch<MarketplaceQuestOut[]>("/marketplace/quests");
  const myQuests = allMarketplaceQuests.filter((q) => q.creator_id === creator!.id);

  return (
    <AppShell>
      <h1 className="font-display text-[20px] font-bold text-ink">{creator.display_name}</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        {t("creator.followerCount", { count: creator.follower_count })}
      </p>

      <Link
        href="/creator/quests/new"
        className="mt-5 block rounded-button pressable border border-line bg-info py-3.5 text-center font-display text-[14px] font-bold text-on-info"
      >
        {t("creator.publishQuest")}
      </Link>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("creator.myQuests")}</h2>
        {myQuests.length === 0 ? (
          <p className="text-[13px] text-ink-faint">—</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myQuests.map((q) => {
              const category = categoryShortKey(q.category_key);
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3"
                >
                  <span className="text-xl">{categoryEmoji[category] ?? "✨"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[13.5px] font-medium text-ink">{q.title}</div>
                    <div className="text-[12px] text-ink-muted">{formatBudget(q.price_amount, q.currency, "")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
