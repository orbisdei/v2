// Shared Nominatim (OpenStreetMap) geocoding helpers — usable from both
// client components and API routes. Nominatim's usage policy requires a
// User-Agent and ~1.1s spacing between calls; the spacing is enforced HERE,
// inside each helper, so callers can just call them back-to-back. (Per-module
// state means separate serverless instances pace independently — acceptable,
// since each instance stays under the limit on its own.)

const NOMINATIM_HEADERS = { 'User-Agent': 'OrbisDei/1.0 (orbisdei.org)' };

let lastNominatimAt = 0;
async function paceNominatim(): Promise<void> {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}

export interface ReverseGeocodeResult {
  country?: string; // ISO 3166-1 alpha-2, uppercased
  region?: string;
  municipality?: string;
  /**
   * Set only when the lookup could not be completed (network error, non-2xx
   * from Nominatim). An empty result with NO error means the call succeeded
   * and Nominatim simply has nothing matching — a completely different
   * situation for anyone trying to work out why a site has no coordinates.
   */
  error?: string;
}

/** Coordinates → { country, region, municipality }. Returns {} on no match,
 *  or { error } when the request itself failed. */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  try {
    await paceNominatim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) return { error: `Nominatim HTTP ${res.status}` };
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return {};
    return {
      country: (addr.country_code as string | undefined)?.toUpperCase(),
      region: addr.state ?? addr.province ?? addr.region ?? addr.county ?? undefined,
      municipality:
        addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.hamlet ?? undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nominatim request failed' };
  }
}

/**
 * Pulls a lat/lon straight out of a Google Maps URL's own encoding — no
 * network call, just pattern matching against the documented URL shapes:
 *   .../@41.902,12.454,17z          (viewport center, most share links)
 *   .../data=...!3d41.902!4d12.454  (the embedded place marker, when present)
 *   ...?q=41.902,12.454             (legacy "q=" query-string form)
 * Returns null when the URL doesn't carry any of these (e.g. a plain
 * name-only search URL with no resolved location yet, or a not-yet-resolved
 * goo.gl/maps.app.goo.gl shortlink — resolve those to their final URL first).
 * The ONE place this parsing logic lives — every caller that has a Google
 * Maps URL and wants coordinates out of it should use this instead of
 * hand-rolling the same regexes.
 */
export function extractCoordsFromMapsUrl(url: string): { lat: number; lon: number } | null {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
  const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) return { lat: parseFloat(dMatch[1]), lon: parseFloat(dMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]) };
  return null;
}

/**
 * Builds a free, unauthenticated Google Maps iframe-embed URL from a stored
 * google_maps_url, so a reviewer can see where GOOGLE itself resolves that
 * exact link — not just re-plot our own lat/lng (the Leaflet mini-map next to
 * it already does that). Uses the classic `maps.google.com/maps?...&
 * output=embed` endpoint: no API key, no billing project involved, unlike
 * the official Maps Embed API. It's undocumented/unsupported by Google
 * (though widely relied on) — no SLA, could change without notice.
 *
 * 2026-08-20: a `place_id:` token in `q=` (the `q=place_id:XXX` form) is an
 * OFFICIAL Maps Embed API convention (`maps/embed/v1/place?key=...&
 * q=place_id:XXX`) — it is NOT documented or confirmed to work against this
 * classic unauthenticated endpoint, which only resolves plain text/address/
 * coordinate queries. Every real google_maps_url in this app is built by
 * buildMapsSearchUrl (lib/places.ts), which ALWAYS includes a plain `query=`
 * text alongside an optional `query_place_id=` — so preferring the plain
 * text here, rather than the place_id, is never a loss of information and
 * is far more likely to actually resolve on this endpoint. A prior version
 * of this function tried place_id first; that's the most likely reason the
 * preview kept rendering Google's whole-earth default even after a `z=`
 * (zoom) parameter was added — the place_id likely never resolved at all,
 * making zoom moot. Kept as a last-resort fallback only for a hand-pasted
 * URL that somehow carries a place_id with no query text at all.
 *
 * Tries, in order: the plain query text (covers name/address search AND the
 * legacy `q=lat,lon` form — Google's embed endpoint accepts coordinates in
 * `q=` just as well as text), an embedded place_id, then raw coordinates
 * pulled via extractCoordsFromMapsUrl (share links with an @lat,lon or
 * !3d!4d segment but no query param at all). Returns null when none of these
 * can be extracted (e.g. an unresolved goo.gl shortlink) rather than guessing.
 *
 * Every branch also pins an explicit `z=` (zoom) — without it a resolved
 * query still renders at Google's default zoom level 0 (the whole earth)
 * rather than zoomed in on the pin.
 */
export function buildFreeMapEmbedUrl(googleMapsUrl: string): string | null {
  const trimmed = googleMapsUrl.trim();
  if (!trimmed) return null;

  let placeId: string | null = null;
  let queryText: string | null = null;
  try {
    const url = new URL(trimmed);
    placeId = url.searchParams.get('query_place_id') || url.searchParams.get('place_id');
    queryText = url.searchParams.get('query') || url.searchParams.get('q');
  } catch {
    // Not a parseable absolute URL — fall through to the coordinate check below.
  }

  if (queryText) return `https://maps.google.com/maps?q=${encodeURIComponent(queryText)}&z=16&output=embed`;
  if (placeId) return `https://maps.google.com/maps?q=place_id:${encodeURIComponent(placeId)}&z=16&output=embed`;

  const coords = extractCoordsFromMapsUrl(trimmed);
  if (coords) return `https://maps.google.com/maps?q=${coords.lat},${coords.lon}&z=16&output=embed`;

  return null;
}

export interface ForwardGeocodeResult {
  lat?: number;
  lon?: number;
  /** Set only when the request itself failed. Absent + no lat/lon means the
   *  call succeeded and Nominatim has no match for this query. */
  error?: string;
}

/** Free-text query → coordinates of the best match. Returns {} on no match,
 *  or { error } when the request itself failed. */
export async function forwardGeocode(query: string): Promise<ForwardGeocodeResult> {
  try {
    await paceNominatim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) return { error: `Nominatim HTTP ${res.status}` };
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Nominatim request failed' };
  }
}
