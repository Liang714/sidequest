import type { ReactNode } from "react";
import clsx from "clsx";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "./button";

/**
 * Empty / error / loading states — spec §I, §J.
 *
 * Two rules enforced by these component signatures rather than by review:
 *   1. An EmptyState without an action is a bug, so `action` is required.
 *   2. An error never shows a status code. `ErrorState` takes a written
 *      message; callers map codes to copy at the call site.
 */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  /** One line on what to do next, in the product's voice. */
  body?: string;
  /** Required — every empty state carries a next step. */
  action: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <span className="text-ink-faint">{icon}</span>}
      <p className="text-h3 text-ink">{title}</p>
      {body && <p className="max-w-[34ch] text-body-s text-ink-muted">{body}</p>}
      {action.href ? (
        <a
          href={action.href}
          className="mt-1 inline-flex h-12 items-center rounded-button bg-hot px-5 text-[14.5px] font-bold text-on-hot"
        >
          {action.label}
        </a>
      ) : (
        <Button size="md" className="mt-1" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  /** Plain language. Never a status code — spec §I. */
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ title, body, onRetry, retryLabel = "Retry", className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "flex flex-col items-center gap-3 rounded-card border border-danger-soft bg-danger-soft px-6 py-8 text-center",
        className,
      )}
    >
      <p className="text-h3 text-ink">{title}</p>
      {body && <p className="max-w-[34ch] text-body-s text-ink-muted">{body}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-1" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Persistent banner. Sits under the header; never blocks the primary CTA. */
export function OfflineBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-line bg-warn-soft px-4 py-2 text-caption text-warn-text"
    >
      <WifiOff aria-hidden className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

/**
 * Skeletons must match the final layout's dimensions exactly, or the page
 * reflows on load and the user loses their place — spec §M.
 * Shimmer is disabled under prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-pulse rounded-md bg-surface-elevated motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** Matches CrewCard's real dimensions — face stack, headline, meta, CTA. */
export function CrewCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-e1">
      <Skeleton className="h-[46px] w-[104px] rounded-pill" />
      <Skeleton className="mt-3 h-6 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-3 h-4 w-2/3" />
      <Skeleton className="mt-4 h-12 w-full rounded-button" />
    </div>
  );
}

/** Matches PersonRow — 32px avatar, name, two meta lines. */
export function PersonRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Skeleton className="h-8 w-8 rounded-pill" />
      <div className="flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-3 w-40" />
      </div>
    </div>
  );
}
