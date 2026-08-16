import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BusinessRegisterForm } from "@/components/business-register-form";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { categoryEmoji } from "@/lib/types";
import { categoryShortKey } from "@/lib/format";
import type { BusinessAnalyticsOut, BusinessOut, SponsoredQuestOut } from "@sidequest/types";
import clsx from "clsx";

export default async function BusinessDashboardPage() {
  await requireSession();
  const t = await getTranslations();

  const businesses = await apiFetch<BusinessOut[]>("/businesses/mine");

  if (businesses.length === 0) {
    return (
      <AppShell>
        <h1 className="mb-2 font-display text-[20px] font-bold text-ink">{t("business.title")}</h1>
        <BusinessRegisterForm />
      </AppShell>
    );
  }

  // Simplification for this pass: one business dashboard per user, same
  // as the persona in docs/PERSONAS.md (a single local business owner) —
  // the backend itself doesn't enforce one-business-per-user (no unique
  // constraint on owner_user_id), so a real multi-business owner would
  // need a switcher added here later.
  const business = businesses[0]!;
  const verified = business.verification_status === "verified";

  const [sponsoredQuests, analytics] = await Promise.all([
    apiFetch<SponsoredQuestOut[]>(`/businesses/${business.id}/quests`),
    verified ? apiFetch<BusinessAnalyticsOut>(`/businesses/${business.id}/analytics`) : Promise.resolve(null),
  ]);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[20px] font-bold text-ink">{business.name}</h1>
        <StatusBadge status={business.verification_status} label={t(`business.status.${business.verification_status}`)} />
      </div>
      <p className="mt-1 text-[13px] text-ink-muted">{business.category}</p>

      {business.verification_status === "pending" && (
        <p className="mt-4 rounded-card border border-line bg-surface p-4 text-[13px] text-ink-muted">
          {t("business.pendingNotice")}
        </p>
      )}
      {business.verification_status === "rejected" && (
        <p className="mt-4 rounded-card border border-coral/40 bg-surface p-4 text-[13px] text-coral">
          {t("business.rejectedNotice")}
        </p>
      )}

      {verified && analytics && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          <StatTile value={analytics.total_views.toString()} label={t("business.analyticsViews")} />
          <StatTile value={analytics.total_joins.toString()} label={t("business.analyticsJoins")} />
          <StatTile value={analytics.total_completions.toString()} label={t("business.analyticsCompletions")} />
          <StatTile value={analytics.total_redemptions.toString()} label={t("business.analyticsRedemptions")} />
        </div>
      )}

      {verified && (
        <Link
          href="/business/quests/new"
          className="mt-5 block rounded-button bg-violet py-3.5 text-center font-display text-[14px] font-semibold text-white"
        >
          {t("business.createSponsoredQuest")}
        </Link>
      )}

      <div className="mt-6">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("business.sponsoredQuests")}</h2>
        {sponsoredQuests.length === 0 ? (
          <p className="text-[13px] text-ink-faint">—</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sponsoredQuests.map((sq) => {
              const stats = analytics?.quests.find((q) => q.quest_id === sq.quest.id);
              const category = categoryShortKey(sq.quest.category_key);
              return (
                <Link
                  key={sq.id}
                  href={`/quests/${sq.quest.id}`}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition-colors hover:border-violet/40"
                >
                  <span className="text-xl">{categoryEmoji[category] ?? "✨"}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[13.5px] font-medium text-ink">{sq.quest.title}</div>
                    <div className="text-[12px] text-ink-muted">{t(`business.sponsorshipType.${sq.sponsorship_type}`)}</div>
                  </div>
                  {stats && (
                    <span className="flex-none font-mono text-[11.5px] text-ink-faint">
                      {t("business.quickStats", { views: stats.views, joins: stats.joins, completions: stats.completions })}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status, label }: { status: BusinessOut["verification_status"]; label: string }) {
  return (
    <span
      className={clsx(
        "rounded-chip px-2.5 py-1 font-mono text-[11px] font-medium",
        status === "verified" && "bg-lime-soft text-lime",
        status === "pending" && "bg-surface-elevated text-ink-muted",
        status === "rejected" && "bg-coral/15 text-coral",
      )}
    >
      {label}
    </span>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3 text-center">
      <div className="font-mono text-[16px] font-medium text-ink">{value}</div>
      <div className="mt-1 text-[10.5px] text-ink-muted">{label}</div>
    </div>
  );
}
