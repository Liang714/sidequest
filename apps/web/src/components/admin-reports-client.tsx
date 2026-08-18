"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { resolveReportAction } from "@/app/actions/moderation";
import type { ReportOut } from "@sidequest/types";

export function AdminReportsClient({ reports }: { reports: ReportOut[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (reportId: string, action: "action" | "dismiss") => {
    setError(null);
    setPendingId(reportId);
    startTransition(async () => {
      const result = await resolveReportAction(reportId, action);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  if (reports.length === 0) {
    return <p className="text-[13px] text-ink-faint">{t("admin.noOpenReports")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-coral">{error}</p>}
      {reports.map((r) => (
        <div key={r.id} className="rounded-card border border-line bg-surface p-4">
          <div className="font-display text-[14px] font-semibold text-ink">
            {t("admin.reportTarget", { type: r.target_type, label: r.target_label })}
          </div>
          <div className="mt-1 text-[12px] text-ink-muted">{t("admin.reportedBy", { name: r.reporter_username })}</div>
          <p className="mt-2 text-[13px] text-ink-muted">{r.reason}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending && pendingId === r.id}
              onClick={() => act(r.id, "action")}
              className="flex-1 rounded-button border border-coral/40 py-2.5 font-display text-[12.5px] font-semibold text-coral disabled:opacity-60"
            >
              {t("admin.action")}
            </button>
            <button
              type="button"
              disabled={pending && pendingId === r.id}
              onClick={() => act(r.id, "dismiss")}
              className="flex-1 rounded-button bg-surface-elevated py-2.5 font-display text-[12.5px] font-semibold text-ink-muted disabled:opacity-60"
            >
              {t("admin.dismiss")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
