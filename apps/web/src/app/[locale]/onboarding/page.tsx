import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getLocationCookie, DEFAULT_SEOUL_CENTER } from "@/lib/location";
import type { InterestOut, QuestSummaryOut } from "@sidequest/types";

export default async function OnboardingPage() {
  await requireSession();

  const coords = (await getLocationCookie()) ?? DEFAULT_SEOUL_CENTER;
  const [interests, nearby] = await Promise.all([
    apiFetch<InterestOut[]>("/interests", { auth: false }),
    // Powers the live "N quests match" counter on the interests step, so
    // the user watches value accrue as they invest rather than filling in
    // a form on faith (spec §C step 3). Location isn't granted yet, so this
    // is the default city view — honest, since that's what they'd see.
    // limit is capped at 50 server-side; asking for more 422s, and the
    // catch below would have swallowed that into an empty list, leaving the
    // counter permanently at zero with no visible error.
    apiFetch<QuestSummaryOut[]>(
      `/quests/nearby?lat=${coords.lat}&lng=${coords.lng}&radius_km=15&limit=50`,
    ).catch(() => [] as QuestSummaryOut[]),
  ]);

  return (
    <OnboardingWizard
      interests={interests}
      questCategories={nearby.map((q) => q.category_key)}
    />
  );
}
