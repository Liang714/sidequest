"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge, Button, EmptyState } from "@/components/ui";
import { CategoryIcon } from "./category-icon";
import { purchaseMarketplaceQuestAction } from "@/app/actions/commerce";
import { categoryShortKey, formatBudget } from "@/lib/format";
import type { MarketplaceQuestOut } from "@sidequest/types";

/**
 * Creator marketplace. Paid quests are honestly labelled — the price is a
 * warn-toned badge, never disguised as an organic listing (spec §L).
 */
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
    return (
      <EmptyState
        icon={<Store className="h-7 w-7" />}
        title={t("marketplace.empty")}
        body={t("marketplace.emptyBody")}
        action={{ label: t("marketplace.emptyAction"), href: "/" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-body-s text-danger-text">
          {error}
        </p>
      )}
      {quests.map((q) => {
        const category = categoryShortKey(q.category_key);
        const busy = pending && pendingId === q.quest_id;
        return (
          <div key={q.id} className="rounded-card border border-line bg-surface p-4 shadow-e1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge tone="neutral" icon={<CategoryIcon category={category} className="h-3 w-3" />}>
                {t(`category.${category}`)}
              </Badge>
              <Badge tone="warn">{formatBudget(q.price_amount, q.currency, "")}</Badge>
            </div>

            <p className="text-h2 text-ink">{q.title}</p>
            <p className="text-body-s text-ink-muted">
              {t("marketplace.byCreator", { name: q.creator_display_name })}
            </p>
            <p className="mt-2 text-body-s text-ink-muted">{q.description}</p>

            {q.already_purchased ? (
              <Button
                variant="secondary"
                block
                className="mt-4"
                onClick={() => router.push(`/quests/${q.quest_id}`)}
              >
                {t("marketplace.viewQuest")}
              </Button>
            ) : (
              <Button block className="mt-4" loading={busy} disabled={!!pending && !busy} onClick={() => purchase(q.quest_id)}>
                {t("marketplace.purchase")}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
