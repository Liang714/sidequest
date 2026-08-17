import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { ItineraryPlannerClient } from "@/components/itinerary-planner-client";
import { requireSession } from "@/lib/auth";
import { getLocationCookie } from "@/lib/location";

export default async function PlanPage() {
  await requireSession();
  const t = await getTranslations();
  const coords = await getLocationCookie();

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("itinerary.title")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("itinerary.subline")}</p>
      <ItineraryPlannerClient initialCoords={coords} />
    </AppShell>
  );
}
