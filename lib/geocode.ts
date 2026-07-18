// Shared Nominatim (OpenStreetMap) geocoding helpers — usable from both
// client components and API routes. Nominatim's usage policy requires a
// User-Agent and ~1.1s spacing between calls; callers are responsible for
// pacing when issuing multiple requests.

const NOMINATIM_HEADERS = { 'User-Agent': 'OrbisDei/1.0 (orbisdei.org)' };

export interface ReverseGeocodeResult {
  country?: string; // ISO 3166-1 alpha-2, uppercased
  region?: string;
  municipality?: string;
}

/** Coordinates → { country, region, municipality }. Returns {} on any failure. */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  try {
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

/** Free-text query → coordinates of the best match. Returns {} on any failure. */
export async function forwardGeocode(query: string): Promise<{ lat?: number; lon?: number }> {
  try {
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
