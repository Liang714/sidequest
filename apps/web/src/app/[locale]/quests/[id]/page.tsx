import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Building2, Camera, Check, MapPin } from "lucide-react";
import clsx from "clsx";
import { AppShell } from "@/components/app-shell";
import { BookActivityWidget } from "@/components/book-activity-widget";
import { CompatibilityBadge } from "@/components/compatibility-badge";
import { ExplainRecommendationButton } from "@/components/explain-recommendation-button";
import { JoinQuestAction } from "@/components/join-quest-action";
import { QuestRoster } from "@/components/quest-roster";
import { ReportQuestButton } from "@/components/report-quest-button";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui";
import { vtName } from "@/components/motion/transition-link";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getLocationCookie } from "@/lib/location";
import { categoryShortKey, formatBudget, formatStartLabel } from "@/lib/format";
import type { CompatibilityOut, QuestOut } from "@sidequest/types";

/**
 * Quest detail — spec §F2.
 *
 * Order is the argument: status → title → WHO'S GOING → what you'll do →
 * where → why it was suggested → join. The roster sits above the CTA
 * because meeting strangers is the real barrier here, and seeing who is
 * already committed does more for the decision than any amount of copy.
 *
 * The pre-rebuild page opened with a 160px category emoji on a colour
 * gradient and put participants in a bare avatar stack two thirds down.
 */
export default async function QuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const t = await getTranslations();

  let quest: QuestOut;
  try {
    quest = await apiFetch<QuestOut>(`/quests/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    if (err instanceof ApiError && err.status === 402) {
      return (
        <AppShell>
          <p className="mb-4 text-body-s text-ink-muted">{t("quest.paywallNotice")}</p>
          <Link href="/marketplace" className="text-body-s font-bold text-hot-text">
            {t("marketplace.navLink")} →
          </Link>
        </AppShell>
      );
    }
    throw err;
  }

  const locale = await getLocale();
  const category = categoryShortKey(quest.category_key);
  const startLabel = formatStartLabel(quest.start_time, locale, (mins) =>
    t("quest.startsIn", { minutes: mins }),
  );
  const budgetLabel = formatBudget(quest.budget_amount, quest.currency, t("createQuest.budgetFree"));

  const mine = quest.participants.find((p) => p.user_id === session.user_id);
  const alreadyJoined = !!mine && mine.status !== "left";

  const minutesToStart = (new Date(quest.start_time).getTime() - Date.now()) / 60000;
  const urgent = minutesToStart > 0 && minutesToStart <= 60;
  const live = minutesToStart <= 0 && quest.status !== "completed";

  const coords = await getLocationCookie();

  // Best-effort — a compatibility failure shouldn't take down the page, it
  // just means the badge doesn't render.
  let compatibility: CompatibilityOut | null = null;
  try {
    const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
    compatibility = await apiFetch<CompatibilityOut>(`/quests/${id}/compatibility${query}`);
  } catch {
    compatibility = null;
  }

  return (
    <AppShell>
      <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-body-s text-ink-muted">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t("common.back")}
      </Link>

      {/* The header card shares a view-transition-name with the feed card,
          so opening a quest morphs the card into this block (spec §4.2). */}
      <header
        className="mt-2 rounded-card border border-line bg-hot-soft p-4 shadow-e2"
        style={{ viewTransitionName: vtName("quest", quest.id) }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" icon={<CategoryIcon category={category} className="h-3 w-3" />}>
            {t(`category.${category}`)}
          </Badge>
          {live && <Badge tone="danger">{t("quest.live")}</Badge>}
          {quest.sponsor && (
            <Badge tone="warn" icon={<Building2 className="h-3 w-3" />}>
              {t("quest.sponsoredBy", { name: quest.sponsor.business_name })}
            </Badge>
          )}
        </div>

        <h1 className="mt-3 text-display text-ink">{quest.title}</h1>

        {/* Time as a datum, coloured only when it's genuinely urgent. */}
        <p
          className={clsx(
            "mt-2 text-numeric tabular-nums",
            urgent ? "text-danger-text" : "text-ink-muted",
          )}
        >
          {startLabel} · {budgetLabel}
        </p>
      </header>

      {quest.description && (
        <p className="mt-4 text-body text-ink-muted">{quest.description}</p>
      )}

      {/* ← the trust surface, above the CTA */}
      <QuestRoster
        participants={quest.participants}
        creatorId={quest.creator_id}
        currentUserId={session.user_id}
        max={quest.max_participants}
      />

      <section className="mt-6">
        <h2 className="mb-2 text-label uppercase text-ink-faint">{t("quest.objectives")}</h2>
        <ul className="rounded-card border border-line bg-surface px-4 shadow-e1">
          {quest.objectives.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-3 border-b border-line py-3 text-body-s last:border-b-0"
            >
              <span
                className={clsx(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-pill border",
                  o.completed_by_me ? "border-line bg-pink animate-pop-in" : "border-line",
                )}
              >
                {o.completed_by_me && (
                  <Check aria-hidden className="h-3 w-3 text-on-pink" strokeWidth={3} />
                )}
              </span>
              <span className={o.completed_by_me ? "text-ink" : "text-ink-muted"}>
                {o.description}
              </span>
              {o.verification_type === "photo" && (
                <Camera aria-hidden className="ml-auto h-4 w-4 shrink-0 text-info-text" />
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-numeric tabular-nums text-pink-text">
          {t("quest.xpReward", { xp: quest.xp_reward })}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-label uppercase text-ink-faint">{t("quest.meetingPoint")}</h2>
        <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-e1">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <div>
            <p className="text-body-s text-ink">
              {quest.location.place_name ?? quest.location.city}
            </p>
            {quest.location.address && (
              <p className="text-caption text-ink-muted">{quest.location.address}</p>
            )}
            {/* Reassurance, per spec §F2 — public place, N people going. */}
            <p className="mt-1 text-caption text-ink-faint">
              {t("quest.publicPlace", { count: quest.joined_count })}
            </p>
          </div>
        </div>
      </section>

      {compatibility && (
        <section className="mt-6 rounded-card border border-line bg-surface p-4 shadow-e1">
          <CompatibilityBadge score={compatibility.score} breakdown={compatibility.breakdown} />
          <ExplainRecommendationButton questId={quest.id} coords={coords} />
        </section>
      )}

      <div className="mt-6">
        <BookActivityWidget questId={quest.id} />
      </div>

      <ReportQuestButton questId={quest.id} />

      {/* Sticky footer: the primary action stays in the thumb zone no
          matter how far down the roster and objectives push the page. */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-md">
        <JoinQuestAction questId={quest.id} joined={alreadyJoined} />
      </div>
    </AppShell>
  );
}
