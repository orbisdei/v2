import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import {
  buildGeocodeQuery,
  backfillNativeNameFromWikidata,
  resolveWikipediaLeadImage,
  importStatusStamp,
  type SourceLink,
  type CelebrationRow,
} from '@/lib/migrateResearchFindings';
import { googlePlacesLookup, buildMapsSearchUrl } from '@/lib/places';
import { forwardGeocode, reverseGeocode } from '@/lib/geocode';
import { toLinkEntries, toCelebrationEntries, linksToPayload, celebrationsToPayload } from '@/lib/createSite';

/**
 * POST — admin-session auth. The "Confirm and Queue" alternative to Confirm's
 * direct pipeline run: instead of creating the site immediately, packages the
 * research_findings row into a pending_submissions row (type='site',
 * action='create') for full review in the normal Admin → Pending Approvals
 * flow — same place contributor site submissions land, so tags/links/images/
 * coordinates are all editable there before anything goes live.
 *
 * Reuses the exact same derivation helpers the direct-run migration path
 * uses (buildGeocodeQuery + googlePlacesLookup/forwardGeocode/reverseGeocode,
 * backfillNativeNameFromWikidata, resolveWikipediaLeadImage) so a queued
 * row's data quality matches what Confirm would have produced — just staged
 * for a human to adjust rather than written straight to `sites`.
 *
 * Deliberately skips the migration script's duplicate-site check: a human is
 * already about to review this in the approvals panel, which has no
 * automated dedup either (contributor submissions rely on the same review).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: row, error: fetchErr } = await service
    .from('research_findings')
    .select(
      'id,name,native_name,description,country,municipality,street_address,interest,tags,source_links,celebrations,site_type,wikipedia_image_url_override'
    )
    .eq('id', id)
    .single();
  if (fetchErr || !row) return NextResponse.json({ error: 'Research finding not found' }, { status: 404 });

  const sourceLinks = (row.source_links ?? []) as SourceLink[];
  const celebrations = (row.celebrations ?? []) as CelebrationRow[];

  // Same geocode chain as the direct-run path: Google Places (regionCode-
  // biased) first, Nominatim fallback. Left blank (not blocked) on a miss —
  // the admin fills them in during review, same as a contributor who hasn't
  // pinned a map location yet.
  const query = buildGeocodeQuery({
    name: row.name,
    street_address: row.street_address,
    municipality: row.municipality,
    country: row.country,
  });

  let lat: number | null = null;
  let lon: number | null = null;
  let placeId: string | null = null;
  const g = await googlePlacesLookup(query, row.country);
  if (g) {
    lat = g.lat;
    lon = g.lon;
    placeId = g.placeId;
  } else {
    const fwd = await forwardGeocode(query);
    if (fwd.lat != null && fwd.lon != null) {
      lat = fwd.lat;
      lon = fwd.lon;
    }
  }

  let region: string | null = null;
  let country = row.country;
  let municipality = row.municipality;
  if (lat != null && lon != null) {
    const rev = await reverseGeocode(lat, lon);
    region = rev.region || null;
    country = rev.country || row.country;
    municipality = rev.municipality || row.municipality;
  }

  const mapsUrl = placeId
    ? buildMapsSearchUrl(query, placeId)
    : row.street_address
    ? buildMapsSearchUrl([row.name, row.street_address].filter(Boolean).join(', '))
    : '';

  let nativeName = row.native_name ?? null;
  if (!nativeName) {
    try {
      nativeName = await backfillNativeNameFromWikidata(sourceLinks, country);
    } catch {
      // best-effort only
    }
  }

  let pickedImageUrl: string | null = row.wikipedia_image_url_override ?? null;
  if (!pickedImageUrl) {
    try {
      pickedImageUrl = await resolveWikipediaLeadImage(sourceLinks, country);
    } catch {
      pickedImageUrl = null;
    }
  }

  const payload = {
    name: row.name,
    native_name: nativeName || null,
    country: (country || '').toUpperCase() || null,
    region,
    municipality: municipality || null,
    generated_id: null,
    short_description: row.description ?? '',
    latitude: lat,
    longitude: lon,
    google_maps_url: mapsUrl,
    interest: row.interest || null,
    type: row.site_type || null,
    tag_ids: (row.tags as string[] | null) ?? [],
    links: linksToPayload(toLinkEntries(sourceLinks)),
    celebrations: celebrationsToPayload(toCelebrationEntries(celebrations)),
    images: pickedImageUrl
      ? [{ url: pickedImageUrl, caption: '', attribution: null, storage_type: 'external', display_order: 0 }]
      : [],
  };

  const { data: submission, error: insertErr } = await service
    .from('pending_submissions')
    .insert({ type: 'site', action: 'create', payload, submitted_by: user.id, status: 'pending' })
    .select('id')
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await service
    .from('research_findings')
    .update({ import_status: importStatusStamp('Queued for approval') })
    .eq('id', id);

  return NextResponse.json({ ok: true, submissionId: submission.id });
}
