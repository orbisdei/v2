import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';

// Hourly cron (vercel.json). Homepage/search read aggregate caches that can't
// be selectively busted per site/tag edit (see lib/revalidate.ts), so scoped
// edits just mark site_config.catalog_dirty instead of paying for a
// catalog-wide bust themselves. This is the read side: only pays for
// revalidateTag(SITES_TAG/TAGS_TAG) — and the resulting page regeneration
// writes — when an edit actually happened since the last run; a quiet hour
// costs nothing.
export async function GET(req: NextRequest) {
  // Vercel Cron authenticates with "Authorization: Bearer ${CRON_SECRET}"
  // automatically when the CRON_SECRET env var is set. Query-param /
  // x-cron-secret forms are kept for manual runs.
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'catalog_dirty')
    .maybeSingle();

  if (data?.value !== true) {
    return NextResponse.json({ ok: true, revalidated: false });
  }

  revalidateTag(SITES_TAG, 'max');
  revalidateTag(TAGS_TAG, 'max');

  await supabase
    .from('site_config')
    .upsert({ key: 'catalog_dirty', value: false, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  return NextResponse.json({ ok: true, revalidated: true });
}
