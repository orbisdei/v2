import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { isValidHttpUrl } from '@/lib/utils';

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
  const { site_id, name, short_description, latitude, longitude, google_maps_url, images, links } = body;

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
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  if (!isValidHttpUrl(google_maps_url)) {
    return NextResponse.json({ error: 'Invalid google_maps_url' }, { status: 400 });
  }
  if (images && !Array.isArray(images)) {
    return NextResponse.json({ error: 'images must be an array' }, { status: 400 });
  }
  if (links && !Array.isArray(links)) {
    return NextResponse.json({ error: 'links must be an array' }, { status: 400 });
  }
  if (links) {
    for (const l of links) {
      if (!isValidHttpUrl(l?.url)) {
        return NextResponse.json({ error: `Invalid link URL: ${l?.url}` }, { status: 400 });
      }
    }
  }

  // Use service client for multi-table writes
  const service = await createServiceClient();

  // 1. Update the sites row
  const { error: siteError } = await service
    .from('sites')
    .update({
      name,
      short_description,
      latitude: lat,
      longitude: lon,
      google_maps_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', site_id);

  if (siteError) {
    return NextResponse.json({ error: siteError.message }, { status: 500 });
  }

  // 2. Replace site_images
  await service.from('site_images').delete().eq('site_id', site_id);

  if (images && images.length > 0) {
    const imageRows = images.map(
      (img: { url: string; caption?: string; storage_type?: string; display_order: number }) => ({
        site_id,
        url: img.url,
        caption: img.caption || null,
        storage_type: img.storage_type || 'local',
        display_order: img.display_order,
      })
    );
    const { error: imgError } = await service.from('site_images').insert(imageRows);
    if (imgError) {
      return NextResponse.json({ error: imgError.message }, { status: 500 });
    }
  }

  // 3. Replace site_links
  await service.from('site_links').delete().eq('site_id', site_id);

  if (links && links.length > 0) {
    const linkRows = links.map((l: { url: string; link_type: string; comment?: string }) => ({
      site_id,
      url: l.url,
      link_type: l.link_type,
      comment: l.comment || null,
    }));
    const { error: linkError } = await service.from('site_links').insert(linkRows);
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
