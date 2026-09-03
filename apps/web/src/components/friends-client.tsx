"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, Button, EmptyState } from "@/components/ui";
import { acceptFriendRequestAction, removeFriendAction } from "@/app/actions/friends";
import type { FriendOut } from "@sidequest/types";

/**
 * Friends — reachable from the You hub since the tab bar rebuild.
 *
 * Every row now links to that person's public profile. Before stage 4 there
 * was nowhere to link to, so a friend was just a name and an avatar; the
 * social graph was a dead end in both directions.
 *
 * The local avatar implementation is gone in favour of the shared one, so a
 * person is the same colour and initial here as on their profile, in a
 * roster, and in a notification.
 */
export function FriendsClient({
  friends,
  requests,
}: {
  friends: FriendOut[];
  requests: FriendOut[];
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string, action: (id: string) => Promise<{ error?: string }>) => {
    setBusyId(id);
    startTransition(async () => {
      await action(id);
      setBusyId(null);
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {requests.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-label uppercase text-ink-faint">
            <UserPlus aria-hidden className="h-3.5 w-3.5" />
            {t("friends.requests")}
          </h2>
          <ul className="flex flex-col gap-2">
            {requests.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-card border border-hot-soft bg-surface p-4 shadow-e1"
              >
                <PersonLink userId={f.user_id} username={f.username} />
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    loading={pending && busyId === f.id}
                    onClick={() => run(f.id, acceptFriendRequestAction)}
                  >
                    {t("friends.accept")}
                  </Button>
                  {/* Declining is silent — USER_FLOWS.md §5: a rejection
                      never notifies the sender. */}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending && busyId === f.id}
                    onClick={() => run(f.id, removeFriendAction)}
                  >
                    {t("friends.decline")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-label uppercase text-ink-faint">
          {t("profile.friendsCount", { count: friends.length })}
        </h2>
        {friends.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={t("friends.emptyTitle")}
            body={t("friends.emptyBody")}
            action={{ label: t("friends.emptyAction"), href: "/" }}
          />
        ) : (
          <ul className="rounded-card border border-line bg-surface px-4 shadow-e1">
            {friends.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
              >
                <PersonLink userId={f.user_id} username={f.username} />
                <button
                  type="button"
                  disabled={pending && busyId === f.id}
                  onClick={() => run(f.id, removeFriendAction)}
                  className="shrink-0 text-caption text-ink-faint underline disabled:opacity-60"
                >
                  {t("friends.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PersonLink({ userId, username }: { userId: string; username: string }) {
  return (
    <Link href={`/users/${userId}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
      <Avatar name={username} userId={userId} size="sm" ringClassName="border-transparent" />
      <span className="truncate text-h3 text-ink">{username}</span>
    </Link>
  );
}
