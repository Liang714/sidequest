import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * CREW Badge — spec §H. Micro label, uppercase (the one style that is).
 *
 * `sponsored` is always the warn tone and always literally says "Sponsored".
 * Paid placement is never disguised as organic — spec §L.
 */

export type BadgeTone = "neutral" | "mint" | "hot" | "warn" | "info" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-elevated text-ink-muted",
  mint: "bg-mint-soft text-mint-text",
  hot: "bg-hot text-on-hot",
  warn: "bg-warn-soft text-warn-text",
  info: "bg-info-soft text-info-text",
  danger: "bg-danger-soft text-danger-text",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ children, tone = "neutral", icon, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-label uppercase",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
