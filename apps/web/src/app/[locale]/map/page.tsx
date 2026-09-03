import { getTranslations } from "next-intl/server";
import { MapIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { QuestMap } from "@/components/quest-map";
import { EmptyState } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { getLocationCookie, DEFAULT_SEOUL_CENTER } from "@/lib/location";
import type { QuestSummaryOut } from "@sidequest/types";

const RADIUS_KM = 15;

export default async function MapPage() {
  await requireSession();
  const t = await getTranslations();

  const coords = (await getLocationCookie()) ?? DEFAULT_SEOUL_CENTER;
  // limit is capped at 50 server-side.
  const quests = await apiFetch<QuestSummaryOut[]>(
    `/quests/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=${RADIUS_KM}&limit=50`,
  );

  return (
    <AppShell>
      <h1 className="text-h1 text-ink">{t("map.title")}</h1>
      <p className="mb-4 text-body-s text-ink-muted">{t("map.subtitle")}</p>

      {quests.length === 0 ? (
        <EmptyState
          icon={<MapIcon className="h-7 w-7" />}
          title={t("home.nobodyYet")}
          body={t("home.beFirst")}
          action={{ label: t("createQuest.title"), href: "/quests/new" }}
        />
      ) : (
        <QuestMap quests={quests} center={coords} radiusKm={RADIUS_KM} />
      )}

      <p className="mt-5 rounded-card border border-line bg-surface p-4 text-caption leading-relaxed text-ink-faint">
        {t("map.placeholderNote")}
      </p>
    </AppShell>
  );
}
