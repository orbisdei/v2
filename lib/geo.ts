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
