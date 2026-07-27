import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidateSite, revalidateTagPage } from '@/lib/revalidate';

// Admin-only cache bust for the inline-edit table cells in SitesPanel/TagsPanel,
// which write directly to Supabase from the browser and otherwise never
// invalidate the ISR cache (unlike /api/publish-site-edit and /api/update-tag).
//
// Scoped to the specific site/tag ids touched — NOT a catalog-wide bust — so a
// normal editing session costs a handful of ISR writes instead of fanning out
// across every site/tag/homepage/search page (see lib/revalidate.ts).
export async function POST(request: NextRequest) {
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

  let body: { siteIds?: unknown; tagIds?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (Array.isArray(body.siteIds)) {
    for (const siteId of body.siteIds) {
      if (typeof siteId === 'string' && siteId) revalidateSite(siteId);
    }
  }
  if (Array.isArray(body.tagIds)) {
    for (const tagId of body.tagIds) {
      if (typeof tagId === 'string' && tagId) revalidateTagPage(tagId);
    }
  }

  return NextResponse.json({ ok: true });
}
