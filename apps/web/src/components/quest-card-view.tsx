import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { FaceStack, Badge } from "@/components/ui";
import { CategoryIcon } from "./category-icon";
import type { Category } from "@/lib/types";

/**
 * The card's presentation, with no data fetching, formatting or i18n.
 *
 * Extracted so the create flow's review step can render the *actual* card
 * the user will see in the feed rather than an approximation of it. QuestCard
 * (a server component) and the create preview (a client component) both
 * render this, so the two cannot drift apart — which is the whole point of
 * previewing (spec §F5).
 */
export interface QuestCardViewProps {
  category: Category;
  categoryLabel: string;
  /** Rendered top-right — spots left, or nothing. */
  meta?: ReactNode;
  people: { id: string; name: string; avatarUrl?: string | null }[];
  /** "Minji, Tae and Sora" — already locale-joined. */
  namesLine?: string;
  /** "are looking for 2 more" — already agreement-correct. */
  needLine?: string;
  title: string;
  place: string;
  budgetLabel: string;
  distanceLabel?: string | null;
  startLabel: string;
  xpLabel: string;
  urgent?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function QuestCardView({
  category,
  categoryLabel,
  meta,
  people,
  namesLine,
  needLine,
  title,
  place,
  budgetLabel,
  distanceLabel,
  startLabel,
  xpLabel,
  urgent = false,
  className,
  style,
}: QuestCardViewProps) {
  const hasCrew = people.length > 0 && !!namesLine;

  return (
    <div
      style={style}
      className={clsx("rounded-card border border-line bg-surface p-4 shadow-e2", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge tone="neutral" icon={<CategoryIcon category={category} className="h-3 w-3" />}>
          {categoryLabel}
        </Badge>
        {meta}
      </div>

      {hasCrew ? (
        <>
          <FaceStack people={people} />
          <p className="mt-3 text-h2 text-ink">{namesLine}</p>
          {needLine && <p className="text-body-s text-ink-muted">{needLine}</p>}
          <p className="mt-3 text-body-s text-ink">{title}</p>
        </>
      ) : (
        // Nobody's in yet — lead with the activity rather than fake a crew.
        <p className="text-h2 text-ink">{title}</p>
      )}

      <p className="mt-1 text-caption text-ink-muted">
        {place} · {budgetLabel}
        {distanceLabel && ` · ${distanceLabel}`}
      </p>

      <p
        className={clsx(
          "mt-2 text-numeric tabular-nums",
          urgent ? "text-danger-text" : "text-ink-muted",
        )}
      >
        {urgent && (
          <span aria-hidden className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-pill bg-danger align-middle motion-reduce:animate-none" />
        )}
        {startLabel}
        <span className="ml-2 inline-block -rotate-2 rounded-md border border-line bg-pink px-1.5 py-px text-caption font-bold text-on-pink">
          {xpLabel}
        </span>
      </p>
    </div>
  );
}
