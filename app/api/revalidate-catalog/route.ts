import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { CATALOG_TAG } from '@/lib/data';

// Hourly cron (vercel.json). Homepage/search read getCatalogSitesSummary/
// getCatalogTags — dedicated cache entries reserved for just those two pages
// (see lib/data.ts) — which can't be selectively busted per site/tag edit, so
// scoped edits just mark site_config.catalog_dirty instead of paying for a
// bust themselves. This is the read side: only pays for
// revalidateTag(CATALOG_TAG) — and the resulting regeneration of exactly
// those two pages — when an edit actually happened since the last run; a
// quiet hour costs nothing. Deliberately does NOT touch SITES_TAG/TAGS_TAG:
// those are also carried by every individual site/tag page's per-entity
// cache (so rare bulk ops can still cascade), and busting them here on an
// hourly cadence would reintroduce the ~700-page fan-out this file exists to
// avoid — CATALOG_TAG is the one tag that reaches ONLY the two catalog pages.
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

  revalidateTag(CATALOG_TAG, 'max');

  await supabase
    .from('site_config')
    .upsert({ key: 'catalog_dirty', value: false, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  return NextResponse.json({ ok: true, revalidated: true });
}
