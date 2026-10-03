import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { Badge, EmptyState } from "@/components/ui";
import type { QuestSummaryOut } from "@sidequest/types";

/**
 * Rooms — spec §D. In CREW the conversation is the product, so it gets a
 * tab. Before this, a quest room existed only at /quests/[id]/room with no
 * navigation path to it whatsoever.
 *
 * Grouped by what the user can act on: live now, then upcoming, then
 * archived. The full room redesign is stage 6; this is the destination the
 * shell needs in order to be navigable.
 */
export default async function RoomsPage() {
  await requireSession();
  const t = await getTranslations();
  const quests = await apiFetch<QuestSummaryOut[]>("/quests/mine");

  const now = Date.now();
  const live = quests.filter(
    (q) => q.status === "in_progress" || (q.status === "open" && new Date(q.start_time).getTime() <= now),
  );
  const upcoming = quests
    .filter((q) => q.status === "open" && new Date(q.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const archived = quests.filter((q) => q.status === "completed" || q.status === "cancelled");

  const empty = live.length === 0 && upcoming.length === 0 && archived.length === 0;

  return (
    <AppShell liveRoom={live.length > 0}>
      <h1 className="mb-5 text-h1 text-ink">{t("rooms.title")}</h1>

      {empty ? (
        <EmptyState
          icon={<MessageCircle className="h-7 w-7" />}
          title={t("rooms.emptyTitle")}
          body={t("rooms.emptyBody")}
          action={{ label: t("rooms.emptyAction"), href: "/" }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Group title={t("rooms.live")} quests={live} live open={t("rooms.open")} />
          <Group title={t("rooms.upcoming")} quests={upcoming} open={t("rooms.open")} />
          <Group title={t("rooms.archived")} quests={archived} muted open={t("rooms.open")} />
        </div>
      )}
    </AppShell>
  );
}

function Group({
  title,
  quests,
  live = false,
  muted = false,
  open,
}: {
  title: string;
  quests: QuestSummaryOut[];
  live?: boolean;
  muted?: boolean;
  open: string;
}) {
  if (quests.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-label uppercase text-ink-faint">{title}</h2>
      <ul className="flex flex-col gap-2">
        {quests.map((q) => (
          <li key={q.id}>
            <Link
              href={`/quests/${q.id}/room`}
              aria-label={`${open} — ${q.title}`}
              className={`flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-e1 ${muted ? "opacity-70" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-h3 text-ink">{q.title}</span>
                  {live && <Badge tone="pink">Live</Badge>}
                </span>
                <span className="block text-caption text-ink-muted">
                  {q.location_city} · {q.joined_count}/{q.max_participants}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
