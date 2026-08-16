/**
 * A small fixed set of real Seoul coordinates so quest creation produces
 * genuine lat/lng without needing a geocoding provider — Kakao/Mapbox
 * geocoding is real Phase-2-continuation scope (see docs/ARCHITECTURE.md
 * §Maps), not something to fake here. This is enough for the nearby-search
 * feature to mean something today.
 */
export const SEOUL_NEIGHBORHOODS = [
  { label: "Hongdae", lat: 37.5563, lng: 126.9236 },
  { label: "Gangnam", lat: 37.4979, lng: 127.0276 },
  { label: "Seongsu", lat: 37.5445, lng: 127.0559 },
  { label: "Itaewon", lat: 37.5347, lng: 126.9947 },
  { label: "Yeonnam-dong", lat: 37.5636, lng: 126.9256 },
  { label: "Jongno", lat: 37.5704, lng: 126.9910 },
  { label: "Yeouido", lat: 37.5219, lng: 126.9245 },
  { label: "Jamsil", lat: 37.5133, lng: 127.1000 },
] as const;
