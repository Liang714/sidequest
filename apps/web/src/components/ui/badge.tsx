import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Bold Pop Badge — spec §2.4. A sticker: micro label, uppercase (the one
 * style that is), black outline, solid fill. `tilt` rotates it 2° so it
 * reads as stuck on rather than printed — opt-in, for hero moments only.
 *
 * `sponsored` is always the warn tone and always literally says "Sponsored".
 * Paid placement is never disguised as organic — spec §5.3.
 */

export type BadgeTone = "neutral" | "pink" | "hot" | "warn" | "info" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface text-ink",
  pink: "bg-pink text-on-pink",
  hot: "bg-hot text-on-hot",
  warn: "bg-warn text-on-warn",
  info: "bg-info text-on-info",
  danger: "bg-danger text-on-danger",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Sticker tilt. Off for badges inside dense rows where it would jitter the baseline. */
  tilt?: boolean;
  className?: string;
}

export function Badge({ children, tone = "neutral", icon, tilt = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border border-line px-2 py-[3px] text-label uppercase",
        TONES[tone],
        tilt && "-rotate-2",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
