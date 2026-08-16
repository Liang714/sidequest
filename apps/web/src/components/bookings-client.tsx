"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import clsx from "clsx";
import { cancelBookingAction } from "@/app/actions/booking";
import { formatBudget } from "@/lib/format";
import type { BookingOut } from "@sidequest/types";

export function BookingsClient({ bookings }: { bookings: BookingOut[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = (id: string) => {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await cancelBookingAction(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  if (bookings.length === 0) {
    return <p className="text-[13px] text-ink-faint">{t("booking.empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-coral">{error}</p>}
      {bookings.map((b) => (
        <div key={b.id} className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px] text-ink">{b.provider_booking_ref}</span>
            <span
              className={clsx(
                "rounded-chip px-2.5 py-1 font-mono text-[11px] font-medium",
                b.status === "confirmed" ? "bg-lime-soft text-lime" : "bg-surface-elevated text-ink-faint",
              )}
            >
              {t(`booking.status.${b.status}`)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[12.5px] text-ink-muted">
            <span>{formatBudget(b.amount, "KRW", "")}</span>
            <span>{t("booking.commissionLabel", { amount: formatBudget(b.commission_amount, "KRW", "") })}</span>
          </div>
          {b.status === "confirmed" && (
            <button
              type="button"
              disabled={pending && pendingId === b.id}
              onClick={() => cancel(b.id)}
              className="mt-3 w-full rounded-button border border-coral/40 py-2 font-display text-[12px] font-semibold text-coral disabled:opacity-60"
            >
              {t("booking.cancel")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
