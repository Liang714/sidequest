"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";

/**
 * XPBar and CompatBadge — spec §H.
 *
 * Both exist to make a number honest rather than impressive.
 */

export interface XPBarProps {
  /** Current XP within the level, and what the next level costs. */
  current: number;
  target: number;
  level: number;
  levelLabel?: string;
  /** Locale for thousands separators. */
  locale?: string;
  className?: string;
}

export function XPBar({ current, target, level, levelLabel, locale = "en", className }: XPBarProps) {
  const pct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const fmt = new Intl.NumberFormat(locale);

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="text-label uppercase text-ink-faint">{levelLabel ?? `Level ${level}`}</span>
        {/* Tabular so the label doesn't jitter as XP ticks up. */}
        <span className="text-caption tabular-nums text-ink-muted">
          {fmt.format(current)} / {fmt.format(target)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`Level ${level} progress`}
        className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-elevated"
      >
        <div
          className="h-full rounded-pill bg-mint transition-[width] duration-500 ease-crew motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface CompatBadgeProps {
  /** 0–100, from the real compute_compatibility() scorer. */
  score: number;
  label?: string;
  /**
   * Opens the real breakdown. Spec §F2: the score is never presented as an
   * opaque number — docs/AI.md is explicit that this is a conventional
   * scorer, so the honest presentation is a transparent one.
   */
  onExplain?: () => void;
  className?: string;
}

export function CompatBadge({ score, label = "your match", onExplain, className }: CompatBadgeProps) {
  const content = (
    <>
      <span className="tabular-nums">{Math.round(score)}%</span> {label}
      {onExplain && <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
    </>
  );

  const classes = clsx(
    "inline-flex items-center gap-1 rounded-chip border border-info-soft bg-info-soft px-3 py-1.5",
    "text-caption font-bold text-info-text",
    className,
  );

  if (!onExplain) return <span className={classes}>{content}</span>;

  return (
    <button type="button" onClick={onExplain} className={clsx(classes, "min-h-11")}>
      {content}
    </button>
  );
}
