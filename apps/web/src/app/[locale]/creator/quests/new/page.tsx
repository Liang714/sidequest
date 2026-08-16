import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { PublishCreatorQuestForm } from "@/components/publish-creator-quest-form";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { CreatorOut } from "@sidequest/types";

export default async function NewCreatorQuestPage() {
  await requireSession();
  const t = await getTranslations();

  let isCreator = true;
  try {
    await apiFetch<CreatorOut>("/creators/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) isCreator = false;
    else throw err;
  }

  if (!isCreator) {
    return (
      <AppShell>
        <h1 className="mb-3 font-display text-[20px] font-bold text-ink">{t("creator.publishQuest")}</h1>
        <p className="mb-4 text-[13px] text-ink-muted">{t("creator.mustRegisterNotice")}</p>
        <Link href="/creator" className="text-[13px] font-medium text-violet">
          ← {t("common.back")}
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/creator" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>
      <h1 className="mb-5 font-display text-[20px] font-bold text-ink">{t("creator.publishQuest")}</h1>
      <PublishCreatorQuestForm />
    </AppShell>
  );
}
