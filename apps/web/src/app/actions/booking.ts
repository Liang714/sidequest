"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { AvailabilitySlotOut, BookingOut } from "@sidequest/types";

export interface AvailabilityResult {
  slots?: AvailabilitySlotOut[];
  error?: string;
}

export async function getAvailabilityAction(
  activityKey: string,
  onDate: string,
  partySize: number,
): Promise<AvailabilityResult> {
  try {
    const slots = await apiFetch<AvailabilitySlotOut[]>(
      `/bookings/availability?activity_key=${encodeURIComponent(activityKey)}&on_date=${onDate}&party_size=${partySize}`,
    );
    return { slots };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export interface BookingActionResult {
  booking?: BookingOut;
  error?: string;
}

export async function createBookingAction(input: {
  quest_id?: string | null;
  activity_key: string;
  slot_ref: string;
  party_size: number;
}): Promise<BookingActionResult> {
  try {
    const booking = await apiFetch<BookingOut>("/bookings", { method: "POST", body: input });
    revalidatePath("/", "layout");
    return { booking };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function cancelBookingAction(bookingId: string): Promise<BookingActionResult> {
  try {
    const booking = await apiFetch<BookingOut>(`/bookings/${bookingId}/cancel`, { method: "POST" });
    revalidatePath("/", "layout");
    return { booking };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
