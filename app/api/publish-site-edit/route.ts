import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/server';

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

  const body = await request.json();
  const { site_id, name, short_description, latitude, longitude, google_maps_url, images, links } = body;

  if (!site_id) {
    return NextResponse.json({ error: 'Missing site_id' }, { status: 400 });
  }

  // Use service client for multi-table writes
  const service = await createServiceClient();

  // 1. Update the sites row
  const { error: siteError } = await service
    .from('sites')
    .update({
      name,
      short_description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
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
