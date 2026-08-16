import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { BookingsClient } from "@/components/bookings-client";
import { requireSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import type { BookingOut } from "@sidequest/types";

export default async function BookingsPage() {
  await requireSession();
  const t = await getTranslations();
  const bookings = await apiFetch<BookingOut[]>("/bookings/mine");

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-[20px] font-bold text-ink">{t("booking.myBookings")}</h1>
      <p className="mb-5 text-[13px] text-ink-muted">{t("booking.myBookingsSubline")}</p>
      <BookingsClient bookings={bookings} />
    </AppShell>
  );
}
