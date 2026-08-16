"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { FriendOut } from "@sidequest/types";

export interface FriendsActionResult {
  error?: string;
}

export async function sendFriendRequestAction(addresseeId: string): Promise<FriendsActionResult> {
  try {
    await apiFetch<FriendOut>("/friends/request", { method: "POST", body: { addressee_id: addresseeId } });
    revalidatePath("/friends");
    return {};
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function acceptFriendRequestAction(friendId: string): Promise<FriendsActionResult> {
  try {
    await apiFetch<FriendOut>(`/friends/${friendId}/accept`, { method: "POST" });
    revalidatePath("/friends");
    return {};
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

/** Also used to decline a still-pending request — there's no separate
 * decline endpoint; removing a pending Friend row is exactly a decline. */
export async function removeFriendAction(friendId: string): Promise<FriendsActionResult> {
  try {
    await apiFetch<void>(`/friends/${friendId}/remove`, { method: "POST" });
    revalidatePath("/friends");
    return {};
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}

export async function blockUserAction(blockedId: string): Promise<FriendsActionResult> {
  try {
    await apiFetch("/blocks", { method: "POST", body: { blocked_id: blockedId } });
    revalidatePath("/friends");
    return {};
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong." };
  }
}
