// Google Places Text Search — the ONE call path for Places lookups (research
// migration, AI bulk import, Parallel import). Field mask stays
// `places.id,places.location`, the free "Essentials ID Only" SKU. `regionCode`
// is a request parameter (bias only), not a response field, so sending it does
// not move the call to a paid tier — always pass the candidate's country code
// when known; it measurably improves match quality for ambiguous names.

export interface PlacesLookupResult {
  lat: number;
  lon: number;
  placeId: string | null;
}

/**
 * Why the lookup produced no coordinates. Collapsing all of these to `null`
 * (which googlePlacesLookup below still does, for its existing callers) makes
 * a missing API key look identical to "this place isn't in the index" — a
 * distinction that matters a lot when a reviewer is staring at a site with no
 * coordinates trying to work out whether the data or the deployment is at
 * fault.
 */
export type PlacesLookupStatus = 'ok' | 'no-key' | 'no-match' | 'error';

export interface PlacesLookupDetailed {
  result: PlacesLookupResult | null;
  status: PlacesLookupStatus;
  /** Human-readable cause, set only when status === 'error'. */
  detail?: string;
}

export async function googlePlacesLookupDetailed(
  query: string,
  regionCode?: string | null
): Promise<PlacesLookupDetailed> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { result: null, status: 'no-key' };
  try {
    const body: Record<string, unknown> = { textQuery: query };
    if (regionCode) body.regionCode = regionCode;
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.location',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Google puts the useful part (bad key, quota, referrer restriction) in
      // the error body, so surface it rather than just the status code.
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        const msg = errBody?.error?.message;
        if (msg) detail += ` — ${msg}`;
      } catch {
        // non-JSON error body; status code alone is what we have
      }
      return { result: null, status: 'error', detail };
    }
    const data = await res.json();
    const place = data.places?.[0];
    if (place?.location && typeof place.location.latitude === 'number') {
      return {
        result: { lat: place.location.latitude, lon: place.location.longitude, placeId: place.id ?? null },
        status: 'ok',
      };
    }
    return { result: null, status: 'no-match' };
  } catch (err) {
    return { result: null, status: 'error', detail: err instanceof Error ? err.message : 'request failed' };
  }
}

/** Coordinates-or-nothing wrapper over googlePlacesLookupDetailed. */
export async function googlePlacesLookup(
  query: string,
  regionCode?: string | null
): Promise<PlacesLookupResult | null> {
  return (await googlePlacesLookupDetailed(query, regionCode)).result;
}

/**
 * Deterministic Google Maps search URL (documented Maps URL scheme, no API
 * call). With a placeId the link resolves to the exact place; without one it's
 * a plain text search — a real, specific link rather than a blank field.
 */
export function buildMapsSearchUrl(query: string, placeId?: string | null): string {
  const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return placeId ? `${base}&query_place_id=${placeId}` : base;
}
