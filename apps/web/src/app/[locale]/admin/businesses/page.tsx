import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { AdminBusinessesClient } from "@/components/admin-businesses-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { BusinessOut } from "@sidequest/types";

export default async function AdminBusinessesPage() {
  const session = await requireSession();
  // Mirrors the backend's own gate (app/deps.py::CurrentAdmin) — a non-admin
  // hitting this URL directly gets a 404, not a "you're not allowed" page
  // that confirms the route exists.
  if (!session.is_admin) notFound();

  const t = await getTranslations();
  const pending = await apiFetch<BusinessOut[]>("/admin/businesses");

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("admin.pendingBusinesses")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("admin.pendingBusinessesSubline")}</p>
      <AdminBusinessesClient businesses={pending} />
    </AppShell>
  );
}
