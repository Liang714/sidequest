import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { CreateQuestForm } from "@/components/create-quest-form";
import { requireSession } from "@/lib/auth";

export default async function CreateQuestPage() {
  await requireSession();
  const t = await getTranslations();

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("createQuest.title")}</h1>
      <CreateQuestForm />
    </AppShell>
  );
}
