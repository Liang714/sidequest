"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

/**
 * Bold Pop Chip — spec §2.4.
 *
 * A selected chip carries a check icon as well as the fill. Color is never
 * the sole signal for state (spec §K) — that rule is what makes the selected
 * state legible to colorblind users and in high-contrast modes.
 *
 * `shared` marks an interest the viewer has in common with the person being
 * viewed. It's the strongest trust signal on a public profile, so it gets
 * pink rather than a neutral tint.
 */

export type ChipTone = "neutral" | "selected" | "shared" | "warn" | "info";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-surface text-ink font-medium",
  selected: "bg-hot text-on-hot font-bold shadow-e1 -translate-x-px -translate-y-px",
  shared: "bg-pink-soft text-pink-text font-bold",
  warn: "bg-warn-soft text-warn-text font-bold",
  info: "bg-info-soft text-info-text font-bold",
};

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  icon?: ReactNode;
  /** Renders as a button. Omit for a static tag. */
  onClick?: () => void;
  /** Drives aria-pressed and the check icon on `selected`. */
  selected?: boolean;
  className?: string;
}

export function Chip({ children, tone = "neutral", icon, onClick, selected, className }: ChipProps) {
  const resolved: ChipTone = selected ? "selected" : tone;

  const content = (
    <>
      {selected ? (
        <Check aria-hidden className="h-[13px] w-[13px] animate-pop-in" strokeWidth={3.5} />
      ) : (
        icon
      )}
      {children}
    </>
  );

  const classes = clsx(
    "inline-flex items-center gap-1.5 rounded-chip border border-line px-3 py-2 text-caption",
    "transition-[transform,box-shadow,background-color] duration-instant ease-snap",
    TONES[resolved],
    className,
  );

  if (!onClick) {
    return <span className={classes}>{content}</span>;
  }

  return (
    // min-h-11 keeps the tap target at 44px even though the chip renders
    // smaller — spec §K.
    <button type="button" onClick={onClick} aria-pressed={selected} className={clsx(classes, "min-h-11 active:translate-x-0 active:translate-y-0 active:shadow-e-none")}>
      {content}
    </button>
  );
}
