"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ticket } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge, Button, EmptyState } from "@/components/ui";
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
    return (
      <EmptyState
        icon={<Ticket className="h-7 w-7" />}
        title={t("booking.empty")}
        body={t("booking.emptyBody")}
        action={{ label: t("booking.emptyAction"), href: "/" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-body-s text-danger-text">
          {error}
        </p>
      )}
      {bookings.map((b) => (
        <div key={b.id} className="rounded-card border border-line bg-surface p-4 shadow-e1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-body-s tabular-nums text-ink">{b.provider_booking_ref}</span>
            <Badge tone={b.status === "confirmed" ? "pink" : "neutral"}>
              {t(`booking.status.${b.status}`)}
            </Badge>
          </div>

          <p className="mt-2 text-h2 tabular-nums text-ink">{formatBudget(b.amount, "KRW", "")}</p>
          {/* The platform fee is stated plainly rather than buried — the
              commission is computed from the provider's confirmed price, so
              showing it costs nothing and hiding it would be the choice. */}
          <p className="text-caption tabular-nums text-ink-muted">
            {t("booking.commissionLabel", {
              amount: formatBudget(b.commission_amount, "KRW", ""),
            })}
          </p>

          {b.status === "confirmed" && (
            <Button
              variant="danger"
              block
              className="mt-3"
              loading={pending && pendingId === b.id}
              onClick={() => cancel(b.id)}
            >
              {t("booking.cancel")}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
