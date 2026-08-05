// Geo math shared by web + mobile. Pure TypeScript — no framework imports.
//
// Moved here from the web app's lib/geo.ts so the Expo app can use the exact
// same distance and formatting logic (see mobile/TODO.md §1). lib/geo.ts is now
// a re-export shim, matching the pattern already used for types/imageUrl/
// interestFilter/countries.

export type DistanceUnit = 'km' | 'mi';

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

/** Regions that display road distances in miles rather than kilometres. */
const IMPERIAL_REGIONS = new Set(['US', 'GB', 'MM', 'LR']);

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Pick a display unit from a BCP-47 locale tag (e.g. `navigator.language`).
 * Defaults to metric, including for a bare language tag with no region.
 */
export function resolveDistanceUnit(locale?: string | null): DistanceUnit {
  if (!locale) return 'km';
  const parts = locale.split('-');
  if (parts.length < 2) return 'km';
  const region = parts[parts.length - 1].toUpperCase();
  return IMPERIAL_REGIONS.has(region) ? 'mi' : 'km';
}

/**
 * Human-readable distance. The metric branch is unchanged from the original
 * lib/geo.ts implementation for values under 10 km, which is the only range the
 * admin coordinate tooling ever passes it — so those call sites render exactly
 * as they did before. Above 10 km both units drop the decimal, since "580km"
 * reads better than "580.0km" in the Around Me sparse-coverage state.
 */
export function formatDistance(meters: number, unit: DistanceUnit = 'km'): string {
  if (unit === 'mi') {
    const miles = meters / METERS_PER_MILE;
    if (miles < 0.1) return `${Math.round(meters * FEET_PER_METER)}ft`;
    if (miles < 10) return `${miles.toFixed(1)}mi`;
    return `${Math.round(miles)}mi`;
  }
  if (meters < 1000) return `${Math.round(meters)}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

/** Same value in the unit's own terms, for radius labels ("5 km" / "3 mi"). */
export function formatRadius(meters: number, unit: DistanceUnit = 'km'): string {
  if (unit === 'mi') return `${Math.round(meters / METERS_PER_MILE)} mi`;
  return `${Math.round(meters / 1000)} km`;
}

// ── Around Me radius ladder ──────────────────────────────────────────────────
//
// A fixed radius hands most of the world an empty list — the catalog is heavily
// weighted toward Europe. So the radius climbs until it has enough results and
// the UI then states which rung it landed on. `null` means "no limit".

export const RADIUS_LADDER: (number | null)[] = [5000, 25000, 100000, null];

/** Minimum results before the ladder stops climbing. */
export const MIN_NEARBY_RESULTS = 3;

export interface WithDistance<T> {
  site: T;
  distanceMeters: number;
}

/**
 * Sort every site by distance from a point, nearest first. Sites with
 * non-finite coordinates are dropped rather than sorted to the end.
 */
export function sortByDistance<T extends { latitude: number; longitude: number }>(
  sites: T[],
  lat: number,
  lng: number,
): WithDistance<T>[] {
  return sites
    .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
    .map((site) => ({ site, distanceMeters: haversineMeters(lat, lng, site.latitude, site.longitude) }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export interface LocationSuggestion {
  municipality: string;
  country?: string | null;
  lat: number;
  lng: number;
  count: number;
}

/**
 * The densest municipalities in a site set, with a centroid for each. Powers the
 * quick-pick pills on the "location is blocked" fallback: they come straight out
 * of the catalog rather than a hand-maintained list, so they can never point
 * somewhere with no coverage, and tapping one costs no geocoder call.
 */
export function deriveLocationSuggestions<
  T extends {
    municipality?: string | null;
    country?: string | null;
    latitude: number;
    longitude: number;
  },
>(sites: T[], limit = 6): LocationSuggestion[] {
  const groups = new Map<string, { s: LocationSuggestion; latSum: number; lngSum: number }>();

  for (const site of sites) {
    if (!site.municipality) continue;
    if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) continue;
    const key = `${site.municipality}|${site.country ?? ''}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = {
        s: { municipality: site.municipality, country: site.country ?? null, lat: 0, lng: 0, count: 0 },
        latSum: 0,
        lngSum: 0,
      };
      groups.set(key, entry);
    }
    entry.latSum += site.latitude;
    entry.lngSum += site.longitude;
    entry.s.count += 1;
  }

  return [...groups.values()]
    .map(({ s, latSum, lngSum }) => ({ ...s, lat: latSum / s.count, lng: lngSum / s.count }))
    .sort((a, b) => b.count - a.count || a.municipality.localeCompare(b.municipality))
    .slice(0, limit);
}

export interface NearbyResult<T> {
  /** Distance-sorted sites within the chosen radius. */
  results: WithDistance<T>[];
  /** The rung the ladder settled on. `null` = no limit applied. */
  radiusMeters: number | null;
  /** True when the ladder had to climb past the requested radius to find results. */
  expanded: boolean;
}

/**
 * Distance-sort `sites` and take everything within the smallest ladder rung that
 * yields at least MIN_NEARBY_RESULTS. Pass `preferredRadius` to start higher up
 * the ladder (the user tapping the radius chip); the ladder still climbs from
 * there if that rung is empty, so the list is never blank when data exists.
 */
export function findNearby<T extends { latitude: number; longitude: number }>(
  sites: T[],
  lat: number,
  lng: number,
  preferredRadius: number | null = RADIUS_LADDER[0],
): NearbyResult<T> {
  const sorted = sortByDistance(sites, lat, lng);
  if (sorted.length === 0) return { results: [], radiusMeters: preferredRadius, expanded: false };

  const startIndex = Math.max(0, RADIUS_LADDER.findIndex((r) => r === preferredRadius));
  const rungs = RADIUS_LADDER.slice(startIndex);

  for (const radius of rungs) {
    const within = radius === null ? sorted : sorted.filter((r) => r.distanceMeters <= radius);
    // The last rung (null) always wins, even below the minimum — at that point
    // "the nearest N, at any distance" is the honest answer.
    if (within.length >= MIN_NEARBY_RESULTS || radius === null) {
      return { results: within, radiusMeters: radius, expanded: radius !== preferredRadius };
    }
  }
  return { results: sorted, radiusMeters: null, expanded: true };
}
