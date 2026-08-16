"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { acceptFriendRequestAction, removeFriendAction } from "@/app/actions/friends";
import { avatarColorFor, initialFromUsername } from "@/lib/format";
import type { FriendOut } from "@sidequest/types";

const avatarBg: Record<string, string> = {
  blue: "var(--accent-blue)",
  violet: "var(--accent-violet)",
  coral: "var(--accent-coral)",
  lime: "var(--accent-lime)",
};

function Avatar({ id, username }: { id: string; username: string }) {
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full font-display text-[14px] font-semibold text-white"
      style={{ background: avatarBg[avatarColorFor(id)] }}
    >
      {initialFromUsername(username)}
    </div>
  );
}

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
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("friends.requests")}</h2>
        {requests.length === 0 ? (
          <p className="text-[13px] text-ink-faint">{t("friends.noRequests")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-card border border-line bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar id={f.user_id} username={f.username} />
                  <span className="font-display text-[14px] font-medium text-ink">{f.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={pending && busyId === f.id}
                    onClick={() => run(f.id, acceptFriendRequestAction)}
                    className="rounded-button bg-blue px-3 py-1.5 font-display text-[12px] font-semibold text-white disabled:opacity-60"
                  >
                    {t("friends.accept")}
                  </button>
                  <button
                    disabled={pending && busyId === f.id}
                    onClick={() => run(f.id, removeFriendAction)}
                    className="rounded-button border border-line px-3 py-1.5 font-display text-[12px] font-semibold text-ink-muted disabled:opacity-60"
                  >
                    {t("friends.decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">
          {t("profile.friendsCount", { count: friends.length })}
        </h2>
        {friends.length === 0 ? (
          <p className="text-[13px] text-ink-faint">{t("friends.noRequests")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-card border border-line bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar id={f.user_id} username={f.username} />
                  <div className="font-display text-[14px] font-medium text-ink">{f.username}</div>
                </div>
                <button
                  disabled={pending && busyId === f.id}
                  onClick={() => run(f.id, removeFriendAction)}
                  className="text-[12px] text-ink-faint underline underline-offset-2 disabled:opacity-60"
                >
                  {t("friends.remove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
