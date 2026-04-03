import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { getCountryName } from '@/lib/countries';
import type { CoordinateCandidate } from '@/lib/types';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  // Auth — administrator only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator')
    return NextResponse.json({ error: 'Forbidden — administrators only' }, { status: 403 });

  let body: { site_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { site_ids } = body;
  if (!Array.isArray(site_ids) || site_ids.length === 0)
    return NextResponse.json({ error: 'site_ids must be a non-empty array' }, { status: 400 });

  const service = await createServiceClient();
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const opencageApiKey = process.env.OPENCAGE_API_KEY;

  const results: { site_id: string; candidates: Omit<CoordinateCandidate, 'id'>[] }[] = [];

  for (const siteId of site_ids as string[]) {
    const { data: site } = await supabase
      .from('sites')
      .select('name, municipality, country')
      .eq('id', siteId)
      .single();
    if (!site) continue;

    const countryName = site.country ? getCountryName(site.country) : '';
    const searchQuery = [site.name, site.municipality, countryName].filter(Boolean).join(', ');
    const candidates: Omit<CoordinateCandidate, 'id'>[] = [];

    // ── Google Places (new) Text Search ──────────────────────────
    if (googleApiKey) {
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'places.location',
          },
          body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          const loc = data?.places?.[0]?.location;
          if (loc?.latitude !== undefined && loc?.longitude !== undefined) {
            const candidate = {
              site_id: siteId,
              source: 'google_places' as const,
              latitude: loc.latitude,
              longitude: loc.longitude,
              fetched_at: new Date().toISOString(),
            };
            await service
              .from('coordinate_candidates')
              .upsert(candidate, { onConflict: 'site_id,source' });
            candidates.push(candidate);
          }
        }
      } catch {
        // Skip this source, continue with others
      }
      await sleep(100);
    }

    // ── OpenCage ─────────────────────────────────────────────────
    if (opencageApiKey) {
      try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(searchQuery)}&key=${opencageApiKey}&limit=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const geom = data?.results?.[0]?.geometry;
          if (geom?.lat !== undefined && geom?.lng !== undefined) {
            const candidate = {
              site_id: siteId,
              source: 'opencage' as const,
              latitude: geom.lat,
              longitude: geom.lng,
              fetched_at: new Date().toISOString(),
            };
            await service
              .from('coordinate_candidates')
              .upsert(candidate, { onConflict: 'site_id,source' });
            candidates.push(candidate);
          }
        }
      } catch {
        // Skip this source, continue with others
      }
      await sleep(1100);
    }

    results.push({ site_id: siteId, candidates });
  }

  return NextResponse.json({ results });
}
