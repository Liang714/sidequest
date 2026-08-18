import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { AdminReportsClient } from "@/components/admin-reports-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { ReportOut } from "@sidequest/types";

export default async function AdminReportsPage() {
  const session = await requireSession();
  // Mirrors the backend's own gate (app/deps.py::CurrentAdmin) — a non-admin
  // hitting this URL directly gets a 404, not a page confirming it exists.
  if (!session.is_admin) notFound();

  const t = await getTranslations();
  const reports = await apiFetch<ReportOut[]>("/admin/reports");

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("admin.reportsQueue")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("admin.reportsQueueSubline")}</p>
      <AdminReportsClient reports={reports} />
    </AppShell>
  );
}
