import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { slugify } from '@/lib/utils';

// TODO: extract to shared helper (duplicated from import-sites/route.ts)
async function getGooglePlaceId(query: string): Promise<string | null> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({ textQuery: query }),
    });
    const data = await res.json();
    return data.places?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  // Auth check
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

  // Parse query params
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  const autoTagIdsParam = searchParams.get('autoTagIds');
  const autoTagIds: string[] = autoTagIdsParam ? JSON.parse(autoTagIdsParam) : [];

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  if (!process.env.PARALLEL_API_KEY) {
    return NextResponse.json({ error: 'PARALLEL_API_KEY not configured' }, { status: 500 });
  }

  // Check task status
  try {
    const statusRes = await fetch(`https://api.parallel.ai/v1/tasks/runs/${runId}`, {
      headers: { 'x-api-key': process.env.PARALLEL_API_KEY },
    });
    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return NextResponse.json({ error: `Parallel status check failed: ${errText}` }, { status: 502 });
    }
    const statusData = await statusRes.json();

    // Still running
    if (statusData.is_active) {
      return NextResponse.json({ status: 'running' });
    }

    // Failed
    if (statusData.status === 'failed' || statusData.status === 'error') {
      return NextResponse.json(
        { status: 'error', error: statusData.error ?? 'Parallel task failed' },
        { status: 502 }
      );
    }

    // Completed — fetch full result and transform
    const resultRes = await fetch(`https://api.parallel.ai/v1/tasks/runs/${runId}/result`, {
      headers: { 'x-api-key': process.env.PARALLEL_API_KEY },
    });
    if (!resultRes.ok) {
      const errText = await resultRes.text();
      return NextResponse.json({ error: `Parallel result fetch failed: ${errText}` }, { status: 502 });
    }
    const resultData = await resultRes.json();
    const output = resultData.output;

    // Parse output — handle both direct array and named-field object
    let rawOutput: any;
    try {
      rawOutput = typeof output === 'string' ? JSON.parse(output) : output;
    } catch {
      return NextResponse.json(
        { status: 'error', error: 'Failed to parse Parallel output', raw: String(output).slice(0, 500) },
        { status: 500 }
      );
    }

    let proposedSites: any[];
    if (Array.isArray(rawOutput)) {
      proposedSites = rawOutput;
    } else if (rawOutput && typeof rawOutput === 'object') {
      // Parallel wraps output in { basis, type, content: { sites: [...] } }
      const content = rawOutput.content ?? rawOutput;
      if (content.sites && Array.isArray(content.sites)) {
        proposedSites = content.sites;
      } else if (Array.isArray(content)) {
        proposedSites = content;
      } else if (typeof content === 'object') {
        // Fallback: find first array that looks like sites (has 'name' field)
        const arrayField = Object.values(content).find(
          (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && 'name' in v[0]
        );
        proposedSites = Array.isArray(arrayField) ? (arrayField as any[]) : [];
      } else {
        proposedSites = [];
      }
    } else {
      proposedSites = [];
    }

    if (proposedSites.length === 0) {
      return NextResponse.json({ status: 'completed', sites: [] });
    }

    // Fetch existing sites for duplicate detection
    const { data: existingSites } = await supabase.from('sites').select('id, name, latitude, longitude');
    const existing = existingSites ?? [];
    const usedSlugs = new Set(existing.map((e) => e.id));

    // Parallel Place ID lookups
    const placeIdResults = await Promise.all(
      proposedSites.map((site: any) => {
        const q = `${site.name}, ${site.municipality}, ${site.country}`;
        return getGooglePlaceId(q);
      })
    );

    // Map to ImportedSite shape
    const sites = proposedSites.map((site: any, i: number) => {
      const searchQ = `${site.name}, ${site.municipality}, ${site.country}`;
      const placeId = placeIdResults[i];
      const mapsUrl = placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQ)}&query_place_id=${placeId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQ)}`;

      let id = slugify(site.name ?? '');
      let counter = 2;
      while (usedSlugs.has(id)) { id = `${slugify(site.name ?? '')}-${counter++}`; }
      usedSlugs.add(id);

      const lat = typeof site.latitude === 'number' ? site.latitude : 0;
      const lon = typeof site.longitude === 'number' ? site.longitude : 0;
      const duplicate = (lat !== 0 && lon !== 0)
        ? existing.find((e) => Math.abs(e.latitude - lat) < 0.0005 && Math.abs(e.longitude - lon) < 0.0005)
        : null;

      const links: Array<{ url: string; link_type: string }> = [];
      if (site.official_website && site.official_website !== 'null') {
        links.push({ url: site.official_website, link_type: 'Official Website' });
      }
      if (site.wikipedia_url && site.wikipedia_url !== 'null') {
        links.push({ url: site.wikipedia_url, link_type: 'Wikipedia' });
      }
      if (Array.isArray(site.source_urls)) {
        for (const srcUrl of site.source_urls) {
          if (typeof srcUrl === 'string' && srcUrl.startsWith('http')) {
            // Don't duplicate URLs already added as Official/Wikipedia
            if (!links.some((l) => l.url === srcUrl)) {
              links.push({ url: srcUrl, link_type: 'Source' });
            }
          }
        }
      }

      return {
        id,
        name: site.name ?? '',
        native_name: site.local_name || undefined,
        country: site.country ?? '',
        municipality: site.municipality ?? '',
        short_description: site.short_description ?? '',
        latitude: lat,
        longitude: lon,
        google_maps_url: mapsUrl,
        interest: ['global', 'regional', 'local', 'personal'].includes(site.interest) ? site.interest : 'regional',
        links,
        tag_ids: autoTagIds,
        status: duplicate ? 'duplicate' as const : 'new' as const,
        duplicate_id: duplicate?.id ?? null,
      };
    });

    return NextResponse.json({ status: 'completed', sites });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Parallel status error: ${message}` }, { status: 502 });
  }
}
