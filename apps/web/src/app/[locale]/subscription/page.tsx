import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { SubscriptionClient } from "@/components/subscription-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { SubscriptionOut } from "@sidequest/types";

export default async function SubscriptionPage() {
  await requireSession();
  const t = await getTranslations();
  const subscription = await apiFetch<SubscriptionOut>("/subscriptions/me");

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("subscription.title")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("subscription.subline")}</p>
      <SubscriptionClient subscription={subscription} />
    </AppShell>
  );
}
