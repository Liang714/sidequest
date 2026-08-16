import "server-only";
import { cookies } from "next/headers";
import { LOCATION_COOKIE, type Coordinates } from "./location-shared";

export { LOCATION_COOKIE } from "./location-shared";
export type { Coordinates } from "./location-shared";

export async function getLocationCookie(): Promise<Coordinates | null> {
  const store = await cookies();
  const raw = store.get(LOCATION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(",").map(Number);
  const lat = parts[0];
  const lng = parts[1];
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

// Default center used until a real location is known — Seoul City Hall.
export const DEFAULT_SEOUL_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 };
