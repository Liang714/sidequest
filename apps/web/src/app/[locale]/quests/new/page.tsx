import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CreateQuestForm } from "@/components/create-quest-form";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { getLocationCookie } from "@/lib/location";
import type { AiQuotaOut } from "@sidequest/types";

export default async function CreateQuestPage() {
  await requireSession();
  const t = await getTranslations();
  const coords = await getLocationCookie();
  const quota = await apiFetch<AiQuotaOut>("/ai/quota");

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("createQuest.title")}</h1>
      <CreateQuestForm initialCoords={coords} initialQuota={quota} />
    </AppShell>
  );
}
