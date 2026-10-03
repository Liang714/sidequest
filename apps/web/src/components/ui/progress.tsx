"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";

/**
 * XPBar and CompatBadge — spec §H.
 *
 * Both exist to make a number honest rather than impressive.
 *
 * Bold Pop XP bar: a chunky outlined track with a striped pink fill that
 * springs to its width. The stripes are static — only the width moves.
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
        className="mt-1.5 h-4 overflow-hidden rounded-pill border border-line bg-surface"
      >
        <div
          className="h-full border-r-2 border-line bg-pink transition-[width] duration-700 ease-pop motion-reduce:transition-none"
          style={{
            width: `${pct}%`,
            // No right border at 0% — a lone 2px line would read as progress.
            borderRightWidth: pct > 0 && pct < 100 ? undefined : 0,
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent 0 6px, rgba(0,0,0,0.12) 6px 12px)",
          }}
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
    "inline-flex items-center gap-1 rounded-chip border border-line bg-info-soft px-3 py-1.5",
    "text-caption font-bold text-info-text",
    className,
  );

  if (!onExplain) return <span className={classes}>{content}</span>;

  return (
    <button type="button" onClick={onExplain} className={clsx(classes, "pressable min-h-11")}>
      {content}
    </button>
  );
}
