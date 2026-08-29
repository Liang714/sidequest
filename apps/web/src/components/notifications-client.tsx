"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bell, UserPlus, Clock, Activity } from "lucide-react";
import clsx from "clsx";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar, Button, EmptyState } from "@/components/ui";
import { payloadString, type NotificationGroup } from "@/lib/notifications";
import { acceptFriendRequestAction } from "@/app/actions/friends";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notifications";
import type { NotificationOut } from "@sidequest/types";

/**
 * Three groups in fixed priority order — needs a decision, time-critical,
 * ambient (spec §F6). Actions resolve INLINE: making someone navigate
 * elsewhere to accept a friend request is pure friction, and it's the whole
 * reason friend_id now travels in the notification payload.
 */

const GROUP_ORDER: NotificationGroup[] = ["needsYou", "startingSoon", "activity"];
const GROUP_ICON: Record<NotificationGroup, typeof Bell> = {
  needsYou: UserPlus,
  startingSoon: Clock,
  activity: Activity,
};

export function NotificationsClient({
  groups,
}: {
  groups: Record<NotificationGroup, NotificationOut[]>;
}) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [handled, setHandled] = useState<Record<string, "accepted" | "read">>({});

  const all = GROUP_ORDER.flatMap((g) => groups[g]);
  const unreadIds = all.filter((n) => !n.read_at).map((n) => n.id);

  if (all.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-7 w-7" />}
        title={t("emptyTitle")}
        action={{ label: t("emptyAction"), href: "/" }}
      />
    );
  }

  function accept(n: NotificationOut) {
    const friendId = payloadString(n, "friend_id");
    if (!friendId) return;
    startTransition(async () => {
      const res = await acceptFriendRequestAction(friendId);
      if (!res.error) {
        setHandled((h) => ({ ...h, [n.id]: "accepted" }));
        await markNotificationReadAction(n.id);
        router.refresh();
      }
    });
  }

  function dismiss(n: NotificationOut) {
    startTransition(async () => {
      await markNotificationReadAction(n.id);
      setHandled((h) => ({ ...h, [n.id]: "read" }));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {unreadIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markAllNotificationsReadAction(unreadIds);
                router.refresh();
              })
            }
          >
            {t("markAllRead")}
          </Button>
        </div>
      )}

      {GROUP_ORDER.map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        const Icon = GROUP_ICON[group];

        return (
          <section key={group}>
            <h2 className="mb-2 flex items-center gap-2 text-label uppercase text-ink-faint">
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {t(`group.${group}`)}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Row
                    n={n}
                    state={handled[n.id]}
                    pending={pending}
                    onAccept={() => accept(n)}
                    onDismiss={() => dismiss(n)}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Row({
  n,
  state,
  pending,
  onAccept,
  onDismiss,
}: {
  n: NotificationOut;
  state?: "accepted" | "read";
  pending: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("notifications");
  const who = payloadString(n, "requester_username") ?? payloadString(n, "addressee_username") ?? "";
  const requesterId = payloadString(n, "requester_id");
  const canAccept = n.type === "friend_request_received" && !!payloadString(n, "friend_id");
  const unread = !n.read_at && !state;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-card border bg-surface p-4 shadow-e1",
        unread ? "border-hot-soft" : "border-line",
      )}
    >
      {who ? <Avatar name={who} userId={requesterId ?? who} size="sm" /> : null}

      <div className="min-w-0 flex-1">
        <p className="text-body-s text-ink">{messageFor(n, who, t)}</p>
        <p className="text-caption tabular-nums text-ink-faint">
          {new Date(n.created_at).toLocaleString()}
        </p>

        {state === "accepted" && (
          <p className="mt-1 text-caption font-semibold text-mint-text">{t("accepted")}</p>
        )}

        {canAccept && !state && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={onAccept} loading={pending}>
              {t("accept")}
            </Button>
            {/* Ignoring is silent — USER_FLOWS.md §5 is explicit that a
                rejection never notifies the sender. */}
            <Button size="sm" variant="ghost" onClick={onDismiss} disabled={pending}>
              {t("ignore")}
            </Button>
          </div>
        )}

        {requesterId && (
          <Link
            href={`/users/${requesterId}`}
            className="mt-2 inline-block text-caption font-bold text-hot-text"
          >
            {t("viewProfile")}
          </Link>
        )}
      </div>
    </div>
  );
}

function messageFor(n: NotificationOut, who: string, t: (k: string, v?: Record<string, string>) => string) {
  switch (n.type) {
    case "friend_request_received":
      return t("friendRequestReceived", { name: who });
    case "friend_request_accepted":
      return t("friendRequestAccepted", { name: who });
    default:
      // Unknown types render legibly rather than blank — new backend types
      // shouldn't require a frontend release to be readable.
      return t("generic", { type: n.type });
  }
}
