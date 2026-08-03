import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildGeocodeQuery } from '@/lib/migrateResearchFindings';
import { googlePlacesLookupDetailed, buildMapsSearchUrl } from '@/lib/places';

/**
 * Admin-only "Auto-Populate from Google" button in SiteForm — a direct
 * Google Places call (Pro-tier, since it requests the `location` field; see
 * lib/places.ts), returning coordinates AND a placeId-based google_maps_url
 * together. Unlike /api/geocode-site (the contributor-visible "Look Up
 * Coordinates" button, which chains Places → Nominatim and never touches
 * google_maps_url), this never falls back to Nominatim — it exists
 * specifically to get an accurate placeId, not just any coordinate.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, native_name, municipality, country } = (await req.json()) as {
    name?: string;
    native_name?: string;
    municipality?: string;
    country?: string;
  };
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const query = buildGeocodeQuery({
    name: name.trim(),
    native_name: native_name ?? null,
    street_address: null,
    municipality: municipality ?? null,
    country: country ?? null,
  });

  const places = await googlePlacesLookupDetailed(query, country);
  if (!places.result) {
    const error =
      places.status === 'no-key'
        ? 'Google Places API key is not configured'
        : places.status === 'error'
        ? places.detail ?? 'Google Places request failed'
        : `No match on Google Places for "${query}"`;
    return NextResponse.json({ error }, { status: places.status === 'no-match' ? 404 : 502 });
  }

  return NextResponse.json({
    latitude: places.result.lat,
    longitude: places.result.lon,
    google_maps_url: buildMapsSearchUrl(query, places.result.placeId),
  });
}
