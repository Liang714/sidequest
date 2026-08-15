import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { FriendsClient } from "@/components/friends-client";
import { friendsList, friendRequests } from "@/lib/mock-data";

export default async function FriendsPage() {
  const t = await getTranslations();

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[22px] font-bold text-ink">{t("friends.title")}</h1>
      <FriendsClient initialFriends={friendsList} initialRequests={friendRequests} />
    </AppShell>
  );
}
