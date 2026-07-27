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
}

/** Coordinates → { country, region, municipality }. Returns {} on any failure. */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  try {
    await paceNominatim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return {};
    return {
      country: (addr.country_code as string | undefined)?.toUpperCase(),
      region: addr.state ?? addr.province ?? addr.region ?? addr.county ?? undefined,
      municipality:
        addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.hamlet ?? undefined,
    };
  } catch {
    return {};
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

/** Free-text query → coordinates of the best match. Returns {} on any failure. */
export async function forwardGeocode(query: string): Promise<{ lat?: number; lon?: number }> {
  try {
    await paceNominatim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: NOMINATIM_HEADERS }
    );
    if (!res.ok) return {};
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return {};
  } catch {
    return {};
  }
}
