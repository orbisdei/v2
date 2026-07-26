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

export async function googlePlacesLookup(
  query: string,
  regionCode?: string | null
): Promise<PlacesLookupResult | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
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
    const data = await res.json();
    const place = data.places?.[0];
    if (place?.location && typeof place.location.latitude === 'number') {
      return { lat: place.location.latitude, lon: place.location.longitude, placeId: place.id ?? null };
    }
    return null;
  } catch {
    return null;
  }
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
