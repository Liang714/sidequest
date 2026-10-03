"use client";

import clsx from "clsx";
import { Avatar } from "./avatar";
import { Button } from "./button";

/**
 * CheckInStrip — spec §F4.
 *
 * Deliberately the second element in the room, above the chat: "are the
 * others actually coming?" is the highest-anxiety question in the whole
 * product, and it deserves an answer before anything else.
 *
 * Arrival is signalled by a pink ring AND the "N of M here" count, never by
 * colour alone (spec §K). Un-arrived avatars dim rather than disappear, so
 * the group size stays legible.
 */

export interface CheckInStripProps {
  people: { id: string; name: string; avatarUrl?: string | null; checkedIn: boolean }[];
  /** Localised at the call site, e.g. "2 of 4 here". */
  countLabel: string;
  /** Hidden once the viewer has checked in. */
  canCheckIn?: boolean;
  onCheckIn?: () => void;
  checkInLabel?: string;
  loading?: boolean;
  className?: string;
}

export function CheckInStrip({
  people,
  countLabel,
  canCheckIn = true,
  onCheckIn,
  checkInLabel = "I'm here",
  loading = false,
  className,
}: CheckInStripProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex">
          {people.map((p, i) => (
            <Avatar
              key={p.id}
              name={p.name}
              userId={p.id}
              src={p.avatarUrl}
              size="sm"
              checkedIn={p.checkedIn}
              dimmed={!p.checkedIn}
             
              className={i > 0 ? "-ml-2" : undefined}
            />
          ))}
        </div>
        {/* aria-live so a screen reader hears arrivals as they happen. */}
        <p aria-live="polite" className="truncate text-body-s font-semibold text-pink-text">
          {countLabel}
        </p>
      </div>

      {canCheckIn && (
        <Button size="sm" onClick={onCheckIn} loading={loading} className="shrink-0">
          {checkInLabel}
        </Button>
      )}
    </div>
  );
}
