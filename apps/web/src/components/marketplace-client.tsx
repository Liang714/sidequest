"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useRouter } from "@/i18n/navigation";
import { purchaseMarketplaceQuestAction } from "@/app/actions/commerce";
import { categoryEmoji } from "@/lib/types";
import { categoryShortKey, formatBudget } from "@/lib/format";
import type { MarketplaceQuestOut } from "@sidequest/types";

export function MarketplaceClient({ quests }: { quests: MarketplaceQuestOut[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purchase = (questId: string) => {
    setError(null);
    setPendingId(questId);
    startTransition(async () => {
      const result = await purchaseMarketplaceQuestAction(questId);
      if (result.error) setError(result.error);
      else if (result.data) router.push(`/quests/${result.data.id}`);
    });
  };

  if (quests.length === 0) {
    return <p className="text-[13px] text-ink-faint">{t("marketplace.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-coral">{error}</p>}
      {quests.map((q) => {
        const category = categoryShortKey(q.category_key);
        const busy = pending && pendingId === q.quest_id;
        return (
          <div key={q.id} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">{categoryEmoji[category] ?? "✨"}</span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[14px] font-semibold text-ink">{q.title}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted">
                  {t("marketplace.byCreator", { name: q.creator_display_name })}
                </div>
                <p className="mt-1.5 text-[12.5px] text-ink-muted">{q.description}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-[14px] font-semibold text-violet">
                {formatBudget(q.price_amount, q.currency, "")}
              </span>
              {q.already_purchased ? (
                <button
                  type="button"
                  onClick={() => router.push(`/quests/${q.quest_id}`)}
                  className="rounded-button bg-lime-soft px-4 py-2 font-display text-[12.5px] font-semibold text-lime"
                >
                  {t("marketplace.viewQuest")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!!pending}
                  onClick={() => purchase(q.quest_id)}
                  className={clsx(
                    "rounded-button bg-violet px-4 py-2 font-display text-[12.5px] font-semibold text-white disabled:opacity-60",
                  )}
                >
                  {busy ? t("common.loading") : t("marketplace.purchase")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
