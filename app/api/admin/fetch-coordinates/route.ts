import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { getCountryName } from '@/lib/countries';
import type { CoordinateCandidate } from '@/lib/types';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the Google Places + OpenCage lookups for one search string. Shared by
 * both the existing-site path (persists into coordinate_candidates) and the
 * ad-hoc path (a site that doesn't exist yet — e.g. a pending_submissions
 * create row in the approval queue, or a brand-new Contribute draft — so
 * there's no site_id to key a cache row on; candidates are returned but never
 * written to the DB).
 */
async function fetchCandidatesForQuery(
  searchQuery: string,
  siteId: string | null,
  service: ReturnType<typeof createServiceClient>,
  googleApiKey: string | undefined,
  opencageApiKey: string | undefined
): Promise<Omit<CoordinateCandidate, 'id'>[]> {
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
            site_id: siteId as string,
            source: 'google_places' as const,
            latitude: loc.latitude,
            longitude: loc.longitude,
            fetched_at: new Date().toISOString(),
          };
          if (siteId) {
            await service.from('coordinate_candidates').upsert(candidate, { onConflict: 'site_id,source' });
          }
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
            site_id: siteId as string,
            source: 'opencage' as const,
            latitude: geom.lat,
            longitude: geom.lng,
            fetched_at: new Date().toISOString(),
          };
          if (siteId) {
            await service.from('coordinate_candidates').upsert(candidate, { onConflict: 'site_id,source' });
          }
          candidates.push(candidate);
        }
      }
    } catch {
      // Skip this source, continue with others
    }
    await sleep(1100);
  }

  return candidates;
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

  let body: {
    site_ids?: unknown;
    // Ad-hoc mode — a site that doesn't exist yet (no site_id to cache
    // against). Used by the coordinate verification widget on new-site
    // submissions in the approval queue.
    query?: { name?: unknown; municipality?: unknown; country?: unknown };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { site_ids, query } = body;
  const hasSiteIds = Array.isArray(site_ids) && site_ids.length > 0;
  const adHocName = typeof query?.name === 'string' ? query.name.trim() : '';
  const hasAdHocQuery = adHocName.length > 0;

  if (!hasSiteIds && !hasAdHocQuery)
    return NextResponse.json(
      { error: 'Provide either a non-empty site_ids array or a query.name' },
      { status: 400 }
    );

  const service = createServiceClient();
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const opencageApiKey = process.env.OPENCAGE_API_KEY;

  const results: { site_id: string | null; candidates: Omit<CoordinateCandidate, 'id'>[] }[] = [];

  if (hasSiteIds) {
    for (const siteId of site_ids as string[]) {
      const { data: site } = await supabase
        .from('sites')
        .select('name, municipality, country')
        .eq('id', siteId)
        .single();
      if (!site) continue;

      const countryName = site.country ? getCountryName(site.country) : '';
      const searchQuery = [site.name, site.municipality, countryName].filter(Boolean).join(', ');
      const candidates = await fetchCandidatesForQuery(searchQuery, siteId, service, googleApiKey, opencageApiKey);
      results.push({ site_id: siteId, candidates });
    }
  } else {
    const municipality = typeof query?.municipality === 'string' ? query.municipality : '';
    const countryCode = typeof query?.country === 'string' ? query.country : '';
    const countryName = countryCode ? getCountryName(countryCode) : '';
    const searchQuery = [adHocName, municipality, countryName].filter(Boolean).join(', ');
    const candidates = await fetchCandidatesForQuery(searchQuery, null, service, googleApiKey, opencageApiKey);
    results.push({ site_id: null, candidates });
  }

  return NextResponse.json({ results });
}
