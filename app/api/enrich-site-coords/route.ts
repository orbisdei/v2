import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

async function forwardGeocode(query: string): Promise<{ lat?: number; lon?: number }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'OrbisDeI/1.0 (orbisdei.org)' } }
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

async function reverseGeocode(lat: number, lon: number): Promise<{ country?: string; municipality?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'OrbisDeI/1.0 (orbisdei.org)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address ?? {};
    return {
      country: (addr.country_code as string)?.toUpperCase(),
      municipality: addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || ''
    };
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, municipality, country, source } = body as {
    name?: string;
    municipality?: string;
    country?: string;
    source?: 'nominatim' | 'google';
  };

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const searchQuery = `${name}${municipality ? `, ${municipality}` : ''}${country ? `, ${country}` : ''}`;

  if (source === 'google') {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.location' // Basic SKU - PAID
        },
        body: JSON.stringify({ textQuery: searchQuery })
      });
      const data = await res.json();
      const place = data.places?.[0];
      if (place?.location) {
        const lat = place.location.latitude;
        const lon = place.location.longitude;
        const revGeo = await reverseGeocode(lat, lon);
        return NextResponse.json({
          latitude: lat,
          longitude: lon,
          country: revGeo.country ?? '',
          municipality: revGeo.municipality ?? '',
        });
      }
      return NextResponse.json({ latitude: 0, longitude: 0, country: '', municipality: '' });
    } catch {
      return NextResponse.json({ error: 'Google Places API error' }, { status: 502 });
    }
  }

  // Default: Nominatim
  const geo = await forwardGeocode(searchQuery);

  if (!geo.lat || !geo.lon) {
    return NextResponse.json({ latitude: 0, longitude: 0, country: '', municipality: '' });
  }

  // Client spaces calls 2.2s apart (two Nominatim calls per request: forward + reverse)
  const revGeo = await reverseGeocode(geo.lat, geo.lon);

  return NextResponse.json({
    latitude: geo.lat,
    longitude: geo.lon,
    country: revGeo.country ?? '',
    municipality: revGeo.municipality ?? '',
  });
}
