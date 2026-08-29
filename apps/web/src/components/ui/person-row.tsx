import type { ReactNode } from "react";
import clsx from "clsx";
import { Avatar } from "./avatar";
import { Badge } from "./badge";

/**
 * PersonRow — a browsable individual. Spec §H, "The Rule of Faces".
 *
 * This component is where CREW's people-first thesis could most easily slide
 * into dating-app territory, so the guardrails are structural:
 *
 *   - the avatar is 32px and non-overlapping (never the visual anchor)
 *   - INTERESTS are the first line under the name, not appearance
 *   - distance arrives as a pre-banded label, never a precise figure
 *   - there is no grid layout for these; rows stay full-width at every
 *     breakpoint, because a two-column people grid IS the banned pattern
 *
 * PRD.md §6 rules out appearance-based matching. Keep it structural.
 */

export type PersonRelation = "none" | "friend" | "pending" | "invited";

export interface PersonRowProps {
  id: string;
  name: string;
  avatarUrl?: string | null;
  /** Shown first — the scannable content. Ones the viewer shares come first. */
  interests: string[];
  /** Pre-banded, e.g. "under 1km". Use distanceBandLabel() — never raw km. */
  distanceLabel: string;
  level?: number;
  mutualCount?: number;
  /** Renders an "EN OK" badge — Jamie's core need in PERSONAS.md. */
  languageBadge?: string;
  relation?: PersonRelation;
  /** Presence note, max 40 chars server-side. */
  note?: string;
  /** Trailing action — usually Invite. */
  action?: ReactNode;
  onOpen?: () => void;
  className?: string;
}

const RELATION_BADGE: Partial<Record<PersonRelation, { label: string; tone: "mint" | "neutral" }>> = {
  friend: { label: "★ Friend", tone: "mint" },
  pending: { label: "Requested", tone: "neutral" },
  invited: { label: "Invited", tone: "neutral" },
};

export function PersonRow({
  id,
  name,
  avatarUrl,
  interests,
  distanceLabel,
  level,
  mutualCount,
  languageBadge,
  relation = "none",
  note,
  action,
  onOpen,
  className,
}: PersonRowProps) {
  const badge = RELATION_BADGE[relation];

  // Meta line: level and mutuals are behaviour/graph signals, not looks.
  const meta = [
    distanceLabel,
    level !== undefined ? `Lv ${level}` : null,
    mutualCount ? `${mutualCount} mutual` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={clsx("flex items-start gap-3 py-3", className)}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${name}'s profile`}
        // 44px hit area around a 32px avatar — spec §K.
        className="-m-1.5 shrink-0 p-1.5"
      >
        <Avatar name={name} userId={id} src={avatarUrl} size="sm" />
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-2 text-left text-h3 text-ink"
        >
          {name}
          {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
        </button>

        {/* Interests lead. This ordering is the guardrail, not a style choice. */}
        <p className="truncate text-caption text-ink-muted">
          {interests.join(", ")}
          {languageBadge && ` · ${languageBadge}`}
        </p>
        <p className="text-caption text-ink-faint">{meta.join(" · ")}</p>
        {note && <p className="mt-1 truncate text-caption italic text-ink">&ldquo;{note}&rdquo;</p>}
      </div>

      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
