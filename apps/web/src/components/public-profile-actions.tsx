"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { blockUserAction, sendFriendRequestAction } from "@/app/actions/friends";
import { submitReportAction } from "@/app/actions/moderation";

/**
 * Add friend / report / block — spec §L principle 12: safety is always one
 * tap away and never suggested. Report and block sit at the bottom in
 * ink-faint, reachable without being prompted.
 */
export function PublicProfileActions({
  userId,
  displayName,
  isFriend,
  pending: alreadyPending,
}: {
  userId: string;
  displayName: string;
  isFriend: boolean;
  pending: boolean;
}) {
  const t = useTranslations("publicProfile");
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [sent, setSent] = useState(alreadyPending);
  const [error, setError] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reported, setReported] = useState(false);

  function addFriend() {
    setError(null);
    startTransition(async () => {
      const res = await sendFriendRequestAction(userId);
      if (res.error) setError(res.error);
      else {
        setSent(true);
        router.refresh();
      }
    });
  }

  function block() {
    startTransition(async () => {
      const res = await blockUserAction(userId);
      if (res.error) setError(res.error);
      // A block hides the profile in both directions, so staying here would
      // show a 404. Go somewhere that still exists.
      else router.push("/");
    });
  }

  function report() {
    startTransition(async () => {
      const res = await submitReportAction({ targetType: "user", targetId: userId, reason: "other" });
      setReported(!res.error);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="mt-8">
      {!isFriend && (
        <Button block size="lg" onClick={addFriend} loading={busy} disabled={sent}>
          {sent ? t("requestSent") : t("addFriend")}
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-center text-caption text-danger-text">
          {t("actionFailed")}
        </p>
      )}

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={report}
          disabled={busy || reported}
          className="text-caption text-ink-faint underline disabled:no-underline"
        >
          {reported ? t("reported") : t("report")}
        </button>
        <button
          type="button"
          onClick={() => setConfirmBlock(true)}
          disabled={busy}
          className="text-caption text-ink-faint underline"
        >
          {t("block")}
        </button>
      </div>

      {confirmBlock && (
        <div className="mt-4 rounded-card border border-danger-soft bg-danger-soft p-4 text-center">
          <p className="text-body-s font-semibold text-ink">{t("blockTitle", { name: displayName })}</p>
          <p className="mt-1 text-caption text-ink-muted">{t("blockBody")}</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="danger" onClick={block} loading={busy}>
              {t("blockConfirm")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmBlock(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
