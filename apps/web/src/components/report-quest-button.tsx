"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitReportAction } from "@/app/actions/moderation";

/**
 * Spec §L principle 12: safety is always one tap away and never suggested.
 * Low contrast, bottom of the page, no icon — reachable without being
 * prompted. Quests had no report affordance at all before this, despite
 * POST /reports and the admin queue both existing since Phase 2.
 */
export function ReportQuestButton({ questId }: { questId: string }) {
  const t = useTranslations("quest");
  const [busy, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <div className="mt-8 text-center">
      <button
        type="button"
        disabled={busy || done}
        onClick={() =>
          start(async () => {
            const res = await submitReportAction({
              targetType: "quest",
              targetId: questId,
              reason: "other",
            });
            if (!res.error) setDone(true);
          })
        }
        className="text-caption text-ink-faint underline disabled:no-underline"
      >
        {done ? t("reported") : t("report")}
      </button>
    </div>
  );
}
