import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { isValidHttpUrl } from '@/lib/utils';
import { syncLocationTags } from '@/lib/locationTags';

export async function POST(request: NextRequest) {
  // Verify the caller is an administrator
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden — administrators only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const {
    site_id,
    new_id,
    name,
    native_name,
    country,
    region,
    municipality,
    short_description,
    latitude,
    longitude,
    google_maps_url,
    interest,
    tag_ids,
    images,
    links,
  } = body;

  if (!site_id || typeof site_id !== 'string') {
    return NextResponse.json({ error: 'Missing site_id' }, { status: 400 });
  }

  // Input validation
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 300) {
    return NextResponse.json({ error: 'Invalid name (1–300 chars)' }, { status: 400 });
  }
  if (typeof short_description !== 'string' || short_description.length > 5000) {
    return NextResponse.json({ error: 'short_description too long (max 5000 chars)' }, { status: 400 });
  }
  const lat = parseFloat(String(latitude));
  const lon = parseFloat(String(longitude));
  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  if (!isValidHttpUrl(google_maps_url)) {
    return NextResponse.json({ error: 'Invalid google_maps_url' }, { status: 400 });
  }
  if (country !== undefined && country !== null && typeof country !== 'string') {
    return NextResponse.json({ error: 'country must be a string' }, { status: 400 });
  }
  if (
    country &&
    typeof country === 'string' &&
    country.trim().length > 0 &&
    country.trim().length !== 2
  ) {
    return NextResponse.json({ error: 'country must be a 2-letter ISO code' }, { status: 400 });
  }
  type ImageRow = { url: string; caption?: string; attribution?: string; storage_type?: string; display_order: number };
  type LinkRow = { url: string; link_type: string; comment?: string };

  if (images && !Array.isArray(images)) {
    return NextResponse.json({ error: 'images must be an array' }, { status: 400 });
  }
  if (links && !Array.isArray(links)) {
    return NextResponse.json({ error: 'links must be an array' }, { status: 400 });
  }

  const typedImages = (images as ImageRow[] | undefined) ?? [];
  const typedLinks = (links as LinkRow[] | undefined) ?? [];

  for (const l of typedLinks) {
    if (!isValidHttpUrl(l?.url)) {
      return NextResponse.json({ error: `Invalid link URL: ${l?.url}` }, { status: 400 });
    }
  }

  // If a new_id is requested, check it doesn't already exist
  const targetId = typeof new_id === 'string' && new_id.trim() && new_id !== site_id
    ? new_id.trim()
    : null;

  if (targetId) {
    const { data: conflict } = await supabase.from('sites').select('id').eq('id', targetId).maybeSingle();
    if (conflict) {
      return NextResponse.json(
        { error: 'A site with this ID already exists — check country, municipality, and name for duplicates.' },
        { status: 409 }
      );
    }
  }

  // Use service client for multi-table writes
  const service = await createServiceClient();

  // 1. Update the sites row (including optional id rename)
  const updatePayload: Record<string, unknown> = {
    name: (name as string).trim(),
    native_name: (native_name as string) || null,
    country: country ? (country as string).toUpperCase().trim() : null,
    region: region ? (region as string).trim() : null,
    municipality: municipality ? (municipality as string).trim() : null,
    short_description: short_description as string,
    latitude: lat,
    longitude: lon,
    google_maps_url: (google_maps_url as string) || null,
    interest: interest ? (interest as string) : null,
    updated_at: new Date().toISOString(),
  };
  if (targetId) {
    updatePayload.id = targetId;
  }

  const { error: siteError } = await service
    .from('sites')
    .update(updatePayload)
    .eq('id', site_id);

  if (siteError) {
    return NextResponse.json({ error: siteError.message }, { status: 500 });
  }

  // After a rename, all subsequent queries use the new id
  const effectiveId = targetId ?? site_id;

  // 2. Replace site_images
  await service.from('site_images').delete().eq('site_id', effectiveId);

  if (typedImages.length > 0) {
    const imageRows = typedImages.map((img) => ({
      site_id: effectiveId,
      url: img.url,
      caption: img.caption || null,
      attribution: img.attribution || null,
      storage_type: img.storage_type || 'local',
      display_order: img.display_order,
    }));
    const { error: imgError } = await service.from('site_images').insert(imageRows);
    if (imgError) {
      return NextResponse.json({ error: imgError.message }, { status: 500 });
    }
  }

  // 3. Replace site_links
  await service.from('site_links').delete().eq('site_id', effectiveId);

  if (typedLinks.length > 0) {
    const linkRows = typedLinks.map((l) => ({
      site_id: effectiveId,
      url: l.url,
      link_type: l.link_type,
      comment: l.comment || null,
    }));
    const { error: linkError } = await service.from('site_links').insert(linkRows);
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  // 4. Replace site_tag_assignments (only when tag_ids is explicitly provided)
  if (tag_ids !== undefined) {
    await service.from('site_tag_assignments').delete().eq('site_id', effectiveId);
    if (Array.isArray(tag_ids) && (tag_ids as string[]).length > 0) {
      const { error: tagError } = await service.from('site_tag_assignments').insert(
        (tag_ids as string[]).map((tag_id) => ({ site_id: effectiveId, tag_id }))
      );
      if (tagError) {
        return NextResponse.json({ error: tagError.message }, { status: 500 });
      }
    }
  }

  await syncLocationTags(
    service,
    effectiveId,
    (country as string)?.toUpperCase() || null,
    (region as string)?.trim() || null,
    (municipality as string)?.trim() || null
  );

  return NextResponse.json({ ok: true, id: effectiveId });
}
