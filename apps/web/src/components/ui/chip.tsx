"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

/**
 * CREW Chip — spec §H.
 *
 * A selected chip carries a check icon as well as the fill. Color is never
 * the sole signal for state (spec §K) — that rule is what makes the selected
 * state legible to colorblind users and in high-contrast modes.
 *
 * `shared` marks an interest the viewer has in common with the person being
 * viewed. It's the strongest trust signal on a public profile, so it gets
 * mint rather than a neutral tint.
 */

export type ChipTone = "neutral" | "selected" | "shared" | "warn" | "info";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-surface-elevated text-ink-muted border-line",
  selected: "bg-hot text-on-hot border-hot font-bold",
  shared: "bg-mint-soft text-mint-text border-mint-soft font-semibold",
  warn: "bg-warn-soft text-warn-text border-warn-soft font-semibold",
  info: "bg-info-soft text-info-text border-info-soft font-semibold",
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
      {selected ? <Check aria-hidden className="h-[13px] w-[13px]" strokeWidth={3} /> : icon}
      {children}
    </>
  );

  const classes = clsx(
    "inline-flex items-center gap-1.5 rounded-chip border px-3 py-2 text-caption",
    "transition-colors duration-150 ease-crew",
    TONES[resolved],
    className,
  );

  if (!onClick) {
    return <span className={classes}>{content}</span>;
  }

  return (
    // min-h-11 keeps the tap target at 44px even though the chip renders
    // smaller — spec §K.
    <button type="button" onClick={onClick} aria-pressed={selected} className={clsx(classes, "min-h-11")}>
      {content}
    </button>
  );
}
