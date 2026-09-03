import type { ReactNode } from "react";
import clsx from "clsx";
import { FaceStack } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";

/**
 * CrewCard — the hero unit of the Tonight feed. Spec §F1.
 *
 * Hierarchy is the whole argument, and it inverts the category's default:
 *   ① faces  ② names  ③ activity + when  ④ trust signals  ⑤ CTA
 *
 * "Minji, Tae & Sora are looking for 2 more" is simultaneously the
 * invitation, the social proof and the urgency — which is why time is
 * demoted to a datum in the meta line rather than given a countdown
 * headline. Social pressure is truer to the product than numeric pressure,
 * and it can't be inflated into FOMO.
 *
 * A 46px overlapping FaceStack is allowed here (and essentially only here):
 * these people have already co-committed to a public plan. See the Rule of
 * Faces in avatar.tsx.
 */

export type CrewCardVariant = "forming" | "full" | "joined" | "past";

export interface CrewCardProps {
  people: { id: string; name: string; avatarUrl?: string | null }[];
  /** Prebuilt, locale-aware — use joinNames() from lib/people. */
  namesLine: string;
  /** e.g. "are looking for 2 more". Carries the urgency. */
  needLine?: string;
  questTitle: string;
  /** e.g. "9:00 PM" */
  time: string;
  /** e.g. "Exit 9, Hongik Univ." — a quest has a public meeting point. */
  place: string;
  /** Real distance is fine for a quest; only PEOPLE get banded. */
  distanceLabel?: string;
  /** e.g. "starts in 45m". A datum, never the headline. */
  startsIn?: string;
  /** True once under an hour — tints the datum, not the whole card. */
  urgent?: boolean;
  variant?: CrewCardVariant;
  sponsored?: boolean;
  /** Trust chips: friend marker, compatibility, language. */
  trust?: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  ctaLoading?: boolean;
  onOpen?: () => void;
  className?: string;
}

export function CrewCard({
  people,
  namesLine,
  needLine,
  questTitle,
  time,
  place,
  distanceLabel,
  startsIn,
  urgent = false,
  variant = "forming",
  sponsored = false,
  trust,
  ctaLabel = "Join them",
  onCta,
  ctaLoading = false,
  onOpen,
  className,
}: CrewCardProps) {
  const isPast = variant === "past";

  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-surface p-4 shadow-e1",
        isPast && "opacity-70",
        className,
      )}
    >
      {(sponsored || variant === "joined" || variant === "full") && (
        <div className="mb-3 flex gap-2">
          {sponsored && <Badge tone="warn">Sponsored</Badge>}
          {variant === "joined" && <Badge tone="mint">You&rsquo;re in</Badge>}
          {variant === "full" && <Badge tone="neutral">Full</Badge>}
        </div>
      )}

      {/* ① faces — 46px, overlapping, ringed to the card surface */}
      <FaceStack people={people} ringClassName="border-surface" />

      {/* ② names — the headline */}
      <button type="button" onClick={onOpen} className="mt-3 block w-full text-left">
        <p className="text-h2 text-ink">{namesLine}</p>
        {needLine && <p className="text-body-s text-ink-muted">{needLine}</p>}

        {/* ③ the activity, second */}
        <p className="mt-3 text-body-s text-ink">
          {questTitle} · {time}
        </p>
        <p className="text-caption text-ink-muted">
          {place}
          {distanceLabel && ` · ${distanceLabel}`}
        </p>
      </button>

      {/* ④ trust signals + time as a datum */}
      {(trust || startsIn) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {trust}
          {startsIn && (
            <span
              className={clsx(
                "ml-auto text-numeric tabular-nums",
                urgent ? "text-danger-text" : "text-ink-muted",
              )}
            >
              {startsIn}
            </span>
          )}
        </div>
      )}

      {/* ⑤ one primary action — spec §L principle 7 */}
      {!isPast && (
        <Button
          block
          className="mt-4"
          onClick={onCta}
          loading={ctaLoading}
          disabled={variant === "full"}
        >
          {variant === "full" ? "Crew full" : ctaLabel}
        </Button>
      )}
    </div>
  );
}
