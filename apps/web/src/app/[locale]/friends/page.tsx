import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { FriendsClient } from "@/components/friends-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { FriendOut } from "@sidequest/types";

export default async function FriendsPage() {
  await requireSession();
  const t = await getTranslations();
  const [friends, requests] = await Promise.all([
    apiFetch<FriendOut[]>("/friends"),
    apiFetch<FriendOut[]>("/friends/requests"),
  ]);

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("friends.title")}</h1>
      <FriendsClient friends={friends} requests={requests} />
    </AppShell>
  );
}
