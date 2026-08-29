import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { badgeCount, groupNotifications } from "@/lib/notifications";
import { NotificationsClient } from "@/components/notifications-client";
import type { NotificationOut } from "@sidequest/types";

/**
 * Notifications — spec §F6, and finding 1 in §A1.
 *
 * GET /notifications and PATCH /notifications/{id}/read have shipped in the
 * API since Phase 2. No client had ever called either, so friend requests,
 * invitations and reminders were invisible and the product had no
 * re-engagement mechanism at all. USER_STORIES.md tags these Must.
 */
export default async function NotificationsPage() {
  await requireSession();
  const t = await getTranslations();

  const items = await apiFetch<NotificationOut[]>("/notifications?limit=50").catch(
    () => [] as NotificationOut[],
  );

  return (
    <AppShell unreadCount={badgeCount(items)}>
      <h1 className="mb-5 text-h1 text-ink">{t("notifications.title")}</h1>
      <NotificationsClient groups={groupNotifications(items)} />
    </AppShell>
  );
}
