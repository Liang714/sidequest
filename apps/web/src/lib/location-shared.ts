// No "server-only" guard here — this file is imported by both server code
// (lib/location.ts) and client components (onboarding-wizard.tsx, which
// sets this cookie directly via document.cookie after a successful
// navigator.geolocation call).
export const LOCATION_COOKIE = "sq_loc";

export interface Coordinates {
  lat: number;
  lng: number;
}
