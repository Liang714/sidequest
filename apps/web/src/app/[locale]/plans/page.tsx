import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { QuestCard } from "@/components/quest-card";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { EmptyState } from "@/components/ui";
import type { BookingOut, QuestSummaryOut } from "@sidequest/types";

/**
 * Plans — spec §D. The commitment ledger: what you've said yes to.
 *
 * This is also where /bookings stops being an orphan (spec §A1 finding 3).
 * Invitations belong here too, but POST /quests/{id}/invite doesn't exist
 * yet — it's specced in §G and lands with presence in stage 5.
 *
 * Quest cards still use the pre-rebuild QuestCard: /quests/mine returns
 * QuestSummaryOut, which carries no participant avatars, so a real CrewCard
 * can't be built from it yet. That's stage 6 work, together with the
 * endpoint change it needs.
 */
export default async function PlansPage() {
  await requireSession();
  const t = await getTranslations();

  const [quests, bookings] = await Promise.all([
    apiFetch<QuestSummaryOut[]>("/quests/mine"),
    // Bookings are a Phase 7 foundation and may be empty; a failure here
    // must not take down the whole tab.
    apiFetch<BookingOut[]>("/bookings/mine").catch(() => [] as BookingOut[]),
  ]);

  const now = Date.now();
  const upcoming = quests
    .filter((q) => q.status !== "completed" && q.status !== "cancelled" && new Date(q.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const history = quests
    .filter((q) => q.status === "completed")
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  const activeBookings = bookings.filter((b) => b.status !== "cancelled");

  const empty = upcoming.length === 0 && history.length === 0 && activeBookings.length === 0;

  return (
    <AppShell>
      <h1 className="mb-5 text-h1 text-ink">{t("plans.title")}</h1>

      {empty ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title={t("plans.emptyTitle")}
          body={t("plans.emptyBody")}
          action={{ label: t("plans.emptyAction"), href: "/" }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {upcoming.length > 0 && (
            <Section title={t("plans.upcoming")}>
              <div className="flex flex-col gap-3">
                {upcoming.map((q) => (
                  <QuestCard key={q.id} quest={q} />
                ))}
              </div>
            </Section>
          )}

          {activeBookings.length > 0 && (
            <Section title={t("plans.bookings")}>
              <ul className="flex flex-col gap-2">
                {activeBookings.slice(0, 3).map((b) => (
                  <li
                    key={b.id}
                    className="rounded-card border border-line bg-surface p-4 text-body-s shadow-e1"
                  >
                    <p className="text-h3 text-ink">{b.provider}</p>
                    <p className="text-caption tabular-nums text-ink-muted">
                      {new Date(b.created_at).toLocaleDateString()} · {b.amount}
                    </p>
                  </li>
                ))}
              </ul>
              <Link href="/bookings" className="mt-2 inline-block text-body-s font-bold text-hot-text">
                {t("plans.allBookings")}
              </Link>
            </Section>
          )}

          {history.length > 0 && (
            <Section title={t("plans.history")}>
              <div className="flex flex-col gap-3">
                {history.slice(0, 5).map((q) => (
                  <QuestCard key={q.id} quest={q} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-label uppercase text-ink-faint">{title}</h2>
      {children}
    </section>
  );
}
