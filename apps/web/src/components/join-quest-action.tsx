"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { joinQuestAction, leaveQuestAction } from "@/app/actions/quests";
import clsx from "clsx";

export function JoinQuestAction({ questId, joined }: { questId: string; joined: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (action: (id: string) => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action(questId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  if (joined) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={`/quests/${questId}/room`}
          className="rounded-button pressable border border-line bg-hot px-5 py-3.5 text-center font-display text-[14px] font-bold text-on-hot"
        >
          {t("quest.viewRoom")}
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => act(leaveQuestAction)}
          className="text-center text-[12px] text-ink-faint underline underline-offset-2 disabled:opacity-60"
        >
          {t("quest.leaveQuest")}
        </button>
        {error && <p className="text-center text-[12px] text-coral">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => act(joinQuestAction)}
        className={clsx(
          "w-full rounded-button pressable border border-line bg-hot py-3.5 font-display text-[14px] font-bold text-on-hot disabled:opacity-60",
        )}
      >
        {t("quest.joinQuest")}
      </button>
      {error && <p className="mt-2 text-center text-[12px] text-coral">{error}</p>}
    </div>
  );
}
