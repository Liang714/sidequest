"use client";

import clsx from "clsx";
import { Circle, CircleDot } from "lucide-react";

/**
 * PresenceStrip — the persistent state of CREW's new mechanic. Spec §F3.
 *
 * Three states, and the design principle behind them is that presence must
 * never be something a user has forgotten they left on:
 *
 *   off       — an invitation, not a nag. Shown once, never pulsing.
 *   on        — ALWAYS shows the remaining time and an edit affordance.
 *   expiring  — warns before it lapses, so ending is never a surprise either.
 *
 * Spec §L principle 3: nobody is discoverable by default, and nobody stays
 * discoverable by accident. This strip is what makes the second half true.
 */

export interface PresenceStripProps {
  state: "off" | "on" | "expiring";
  /** e.g. "You're free until 11 PM" / "Visible for 15 more minutes". */
  label: string;
  /** "Edit" when on, "I'm free tonight" when off. */
  actionLabel: string;
  onAction?: () => void;
  className?: string;
}

export function PresenceStrip({ state, label, actionLabel, onAction, className }: PresenceStripProps) {
  const active = state !== "off";

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-card border px-4 py-3",
        active ? "border-mint-soft bg-mint-soft" : "border-line bg-surface",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {active ? (
          <CircleDot aria-hidden className="h-4 w-4 shrink-0 text-mint-text" />
        ) : (
          <Circle aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
        )}
        <span
          className={clsx(
            "truncate text-body-s",
            // `expiring` gets weight, not a colour change — it's a heads-up,
            // not an error, and the strip must not read as alarming.
            active ? "font-semibold text-mint-text" : "text-ink-muted",
            state === "expiring" && "text-warn-text",
          )}
        >
          {label}
        </span>
      </span>

      <button
        type="button"
        onClick={onAction}
        className={clsx(
          "shrink-0 text-body-s font-bold underline underline-offset-2",
          active ? "text-mint-text" : "text-hot-text",
        )}
      >
        {actionLabel}
      </button>
    </div>
  );
}
