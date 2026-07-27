import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';

// Admin-only cache bust for the inline-edit table cells in SitesPanel/TagsPanel,
// which write directly to Supabase from the browser and otherwise never
// invalidate the ISR cache (unlike /api/publish-site-edit and /api/update-tag).
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

  let body: { scope?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // no body = default scope
  }

  const scope = Array.isArray(body.scope) ? body.scope : ['sites'];
  if (scope.includes('sites')) revalidateTag(SITES_TAG, 'max');
  if (scope.includes('tags')) revalidateTag(TAGS_TAG, 'max');

  return NextResponse.json({ ok: true });
}
