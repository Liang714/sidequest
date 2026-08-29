import type { NotificationOut } from "@sidequest/types";

/**
 * Notification grouping — spec §F6.
 *
 * Three groups in a fixed priority order: needs a decision → time-critical
 * → ambient. The badge counts only the first two, so ambient activity can
 * never inflate it. A badge that lies gets ignored, and then the real ones
 * get ignored too.
 *
 * Unknown types fall through to `activity` on purpose: the backend emits
 * only friend_request_received/accepted today, and the quest invites and
 * start-time reminders the spec describes land in later stages. They should
 * render sanely the moment they exist, not 500 the page.
 */

export type NotificationGroup = "needsYou" | "startingSoon" | "activity";

const NEEDS_YOU = new Set(["friend_request_received", "quest_invite"]);
const STARTING_SOON = new Set(["quest_starting_soon", "quest_reminder"]);

export function groupOf(n: NotificationOut): NotificationGroup {
  if (NEEDS_YOU.has(n.type)) return "needsYou";
  if (STARTING_SOON.has(n.type)) return "startingSoon";
  return "activity";
}

export function groupNotifications(items: NotificationOut[]): Record<NotificationGroup, NotificationOut[]> {
  const out: Record<NotificationGroup, NotificationOut[]> = {
    needsYou: [],
    startingSoon: [],
    activity: [],
  };
  for (const n of items) out[groupOf(n)].push(n);
  return out;
}

/** Only actionable + time-critical unread items count toward the badge. */
export function badgeCount(items: NotificationOut[]): number {
  return items.filter((n) => !n.read_at && groupOf(n) !== "activity").length;
}

/** Payload is `dict[str, unknown]` on the wire; read it defensively. */
export function payloadString(n: NotificationOut, key: string): string | undefined {
  const v = (n.payload as Record<string, unknown> | null | undefined)?.[key];
  return typeof v === "string" ? v : undefined;
}
