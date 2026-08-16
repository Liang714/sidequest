import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/components/marketplace-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { MarketplaceQuestOut } from "@sidequest/types";

export default async function MarketplacePage() {
  await requireSession();
  const t = await getTranslations();
  const quests = await apiFetch<MarketplaceQuestOut[]>("/marketplace/quests");

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("marketplace.title")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("marketplace.subline")}</p>
      <MarketplaceClient quests={quests} />
    </AppShell>
  );
}
