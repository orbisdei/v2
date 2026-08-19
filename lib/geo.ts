// Re-export shim → @orbisdei/shared/src/geo (keeps @/lib/geo imports working).
//
// haversineMeters / formatDistance moved into the shared package so the Expo app
// uses one implementation; distanceBadgeClass stays here because it emits
// Tailwind class names for the admin coordinate tooling and has no mobile
// counterpart.

export {
  haversineMeters,
  formatDistance,
  formatRadius,
  resolveDistanceUnit,
  sortByDistance,
  findNearby,
  deriveLocationSuggestions,
  RADIUS_LADDER,
  MIN_NEARBY_RESULTS,
  type DistanceUnit,
  type WithDistance,
  type NearbyResult,
  type LocationSuggestion,
} from '@orbisdei/shared/src/geo';

export function distanceBadgeClass(meters: number): string {
  if (meters < 50) return 'bg-green-100 text-green-800';
  if (meters < 500) return 'bg-yellow-100 text-yellow-800';
  if (meters < 2000) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// coordinate_candidates.source -> single-letter MapView `pinLabels` badge.
// Shared by the two coordinate-comparison mini-maps — SitesPanel's admin
// accordion editor and CoordinateVerification (used via SiteForm's
// Contribute/Edit/Import flows) — so Google vs OpenCage pins read the same
// way everywhere and can't drift between the two call sites. /api/admin/
// fetch-coordinates only ever writes 'google_places' or 'opencage' rows —
// there is no live "nominatim" coordinate-candidate source.
export const COORDINATE_SOURCE_PIN_LABELS: Record<string, string> = {
  google_places: 'G',
  opencage: 'O',
};
