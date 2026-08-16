"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { createBookingAction, getAvailabilityAction } from "@/app/actions/booking";
import { formatBudget } from "@/lib/format";
import { Field, inputClass } from "./form-field";
import type { AvailabilitySlotOut, BookingOut } from "@sidequest/types";

const ACTIVITIES = [
  { key: "bowling", emoji: "🎳" },
  { key: "karaoke", emoji: "🎤" },
  { key: "restaurant_table", emoji: "🍽️" },
  { key: "escape_room", emoji: "🔐" },
] as const;

function tomorrow(): string {
  // Build the date from local Y/M/D components, not toISOString() — that
  // converts to UTC first, which silently shifts the calendar date near
  // midnight depending on the browser's timezone offset (e.g. late-night
  // UTC-negative timezones would see today's date, not tomorrow's).
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookActivityWidget({ questId }: { questId: string }) {
  const t = useTranslations();
  const [activityKey, setActivityKey] = useState<string>(ACTIVITIES[0].key);
  const [onDate, setOnDate] = useState(tomorrow());
  const [partySize, setPartySize] = useState(2);
  const [slots, setSlots] = useState<AvailabilitySlotOut[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [bookingPending, startBookingTransition] = useTransition();
  const [bookingSlotRef, setBookingSlotRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookingOut | null>(null);

  const checkAvailability = () => {
    setError(null);
    setConfirmed(null);
    setSlots(null);
    startTransition(async () => {
      const result = await getAvailabilityAction(activityKey, onDate, partySize);
      if (result.error) setError(result.error);
      else setSlots(result.slots ?? []);
    });
  };

  const book = (slot: AvailabilitySlotOut) => {
    setError(null);
    setBookingSlotRef(slot.slot_ref);
    startBookingTransition(async () => {
      const result = await createBookingAction({
        quest_id: questId,
        activity_key: activityKey,
        slot_ref: slot.slot_ref,
        party_size: partySize,
      });
      if (result.error) setError(result.error);
      else if (result.booking) {
        setConfirmed(result.booking);
        setSlots(null);
      }
    });
  };

  if (confirmed) {
    return (
      <div className="rounded-card border border-lime/40 bg-lime-soft p-4 text-center">
        <p className="font-display text-[14px] font-semibold text-ink">{t("booking.confirmed")}</p>
        <p className="mt-1 font-mono text-[12px] text-ink-muted">{confirmed.provider_booking_ref}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h2 className="mb-3 font-display text-[13px] font-semibold text-ink">{t("booking.title")}</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {ACTIVITIES.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => {
              setActivityKey(a.key);
              setSlots(null);
              setConfirmed(null);
            }}
            className={clsx(
              "rounded-chip border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              activityKey === a.key ? "border-blue/50 bg-blue-soft text-blue" : "border-line bg-surface text-ink-muted",
            )}
          >
            {a.emoji} {t(`booking.activity.${a.key}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("createQuest.fieldDate")}>
          <input type="date" min={tomorrow()} value={onDate} onChange={(e) => setOnDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("booking.fieldPartySize")}>
          <input
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={checkAvailability}
        className="mt-3 w-full rounded-button bg-blue py-2.5 font-display text-[12.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("booking.checkAvailability")}
      </button>

      {error && <p className="mt-2 text-[12px] text-coral">{error}</p>}

      {slots && (
        <div className="mt-3 flex flex-col gap-2">
          {slots.length === 0 ? (
            <p className="text-[12.5px] text-ink-faint">{t("booking.noSlots")}</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.slot_ref}
                className="flex items-center justify-between rounded-button border border-line bg-surface-elevated px-3 py-2.5"
              >
                <span className="text-[12.5px] text-ink">
                  {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
                    new Date(slot.start_time),
                  )}
                </span>
                <span className="font-mono text-[12px] text-ink-muted">
                  {formatBudget(slot.price_amount, slot.currency, "")}
                </span>
                <button
                  type="button"
                  disabled={bookingPending}
                  onClick={() => book(slot)}
                  className="rounded-button bg-lime px-3 py-1.5 font-display text-[11.5px] font-semibold text-[#0B0B0F] disabled:opacity-60"
                >
                  {bookingPending && bookingSlotRef === slot.slot_ref ? t("common.loading") : t("booking.book")}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
