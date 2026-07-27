import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildGeocodeQuery } from '@/lib/migrateResearchFindings';
import { googlePlacesLookup } from '@/lib/places';
import { forwardGeocode, extractCoordsFromMapsUrl } from '@/lib/geocode';

/**
 * On-demand coordinate lookup for the "Look Up Coordinates" button in
 * SiteForm — the manual counterpart to the automated research pipeline's
 * geocode chain (lib/migrateResearchFindings.ts), reusing the exact same
 * helpers so results match: an already-populated google_maps_url's own
 * embedded coordinates first (no API call), then Google Places (regionCode-
 * biased), then Nominatim.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, native_name, municipality, country, google_maps_url } = (await req.json()) as {
    name?: string;
    native_name?: string;
    municipality?: string;
    country?: string;
    google_maps_url?: string;
  };
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  if (google_maps_url?.trim()) {
    const urlCoords = extractCoordsFromMapsUrl(google_maps_url);
    if (urlCoords) {
      return NextResponse.json({ latitude: urlCoords.lat, longitude: urlCoords.lon, source: 'maps_url' });
    }
  }

  const query = buildGeocodeQuery({
    name: name.trim(),
    native_name: native_name ?? null,
    street_address: null,
    municipality: municipality ?? null,
    country: country ?? null,
  });

  const g = await googlePlacesLookup(query, country);
  if (g) {
    return NextResponse.json({ latitude: g.lat, longitude: g.lon, source: 'google_places' });
  }

  const fwd = await forwardGeocode(query);
  if (fwd.lat != null && fwd.lon != null) {
    return NextResponse.json({ latitude: fwd.lat, longitude: fwd.lon, source: 'nominatim' });
  }

  return NextResponse.json({ error: 'No coordinates found — try pasting a Google Maps link instead, or enter them manually.' }, { status: 404 });
}
