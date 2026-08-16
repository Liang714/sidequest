import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import type { InterestOut } from "@sidequest/types";

export default async function OnboardingPage() {
  await requireSession();
  const interests = await apiFetch<InterestOut[]>("/interests", { auth: false });

  return <OnboardingWizard interests={interests} />;
}
