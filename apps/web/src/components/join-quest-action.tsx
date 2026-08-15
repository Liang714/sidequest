"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import clsx from "clsx";

export function JoinQuestAction({ questId }: { questId: string }) {
  const t = useTranslations();
  const [joined, setJoined] = useState(false);

  if (joined) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={`/quests/${questId}/room`}
          className="rounded-button bg-blue px-5 py-3.5 text-center font-display text-[14px] font-semibold text-white shadow-glow-blue"
        >
          {t("quest.viewRoom")}
        </Link>
        <button
          type="button"
          onClick={() => setJoined(false)}
          className="text-center text-[12px] text-ink-faint underline underline-offset-2"
        >
          {t("quest.leaveQuest")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setJoined(true)}
      className={clsx(
        "w-full rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue transition-transform active:scale-[0.98]",
      )}
    >
      {t("quest.joinQuest")}
    </button>
  );
}
