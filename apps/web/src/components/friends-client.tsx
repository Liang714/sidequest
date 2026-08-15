"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { QuestUser } from "@/lib/types";

const avatarBg: Record<QuestUser["avatarColor"], string> = {
  blue: "var(--accent-blue)",
  violet: "var(--accent-violet)",
  coral: "var(--accent-coral)",
  lime: "var(--accent-lime)",
};

function Avatar({ user }: { user: QuestUser }) {
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-full font-display text-[14px] font-semibold text-white"
      style={{ background: avatarBg[user.avatarColor] }}
    >
      {user.avatarInitial}
    </div>
  );
}

export function FriendsClient({
  initialFriends,
  initialRequests,
}: {
  initialFriends: QuestUser[];
  initialRequests: QuestUser[];
}) {
  const t = useTranslations();
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);

  const accept = (user: QuestUser) => {
    setRequests((prev) => prev.filter((u) => u.id !== user.id));
    setFriends((prev) => [...prev, user]);
  };
  const decline = (user: QuestUser) => setRequests((prev) => prev.filter((u) => u.id !== user.id));
  const remove = (user: QuestUser) => setFriends((prev) => prev.filter((u) => u.id !== user.id));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("friends.requests")}</h2>
        {requests.length === 0 ? (
          <p className="text-[13px] text-ink-faint">{t("friends.noRequests")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-card border border-line bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={u} />
                  <span className="font-display text-[14px] font-medium text-ink">{u.username}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => accept(u)}
                    className="rounded-button bg-blue px-3 py-1.5 font-display text-[12px] font-semibold text-white"
                  >
                    {t("friends.accept")}
                  </button>
                  <button
                    onClick={() => decline(u)}
                    className="rounded-button border border-line px-3 py-1.5 font-display text-[12px] font-semibold text-ink-muted"
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
        <div className="flex flex-col gap-2">
          {friends.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-card border border-line bg-surface p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar user={u} />
                <div>
                  <div className="font-display text-[14px] font-medium text-ink">{u.username}</div>
                  <div className="text-[12px] text-ink-faint">Lv. {u.level}</div>
                </div>
              </div>
              <button
                onClick={() => remove(u)}
                className="text-[12px] text-ink-faint underline underline-offset-2"
              >
                {t("friends.remove")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
