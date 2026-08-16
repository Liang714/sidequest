import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CreateSponsoredQuestForm } from "@/components/create-sponsored-quest-form";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { BusinessOut } from "@sidequest/types";

export default async function NewSponsoredQuestPage() {
  await requireSession();
  const t = await getTranslations();

  const businesses = await apiFetch<BusinessOut[]>("/businesses/mine");
  const verifiedBusiness = businesses.find((b) => b.verification_status === "verified");

  if (!verifiedBusiness) {
    return (
      <AppShell>
        <h1 className="mb-3 font-display text-[20px] font-bold text-ink">{t("business.createSponsoredQuest")}</h1>
        <p className="mb-4 text-[13px] text-ink-muted">{t("business.mustBeVerifiedNotice")}</p>
        <Link href="/business" className="text-[13px] font-medium text-blue">
          ← {t("common.back")}
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/business" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>
      <h1 className="mb-5 font-display text-[20px] font-bold text-ink">{t("business.createSponsoredQuest")}</h1>
      <CreateSponsoredQuestForm businessId={verifiedBusiness.id} />
    </AppShell>
  );
}
