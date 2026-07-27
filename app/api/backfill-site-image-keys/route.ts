import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadSiteImage, deleteSiteImage, isR2Url } from '@/lib/storage';
import { revalidateSite } from '@/lib/revalidate';

// One-shot backfill: existing site images were stored at the old stable,
// position-based key (sites/{id}/{NNN}.jpg, NNN = display_order + 1) — every
// reorder overwrote that key's bytes in place, and Cloudflare/browsers kept
// serving the pre-reorder image at that url for up to a year (max-age is a
// year, no version bump). This re-keys each one to the versioned format
// (sites/{id}/{timestamp}-{name}.jpg, immutable-cached) that uploadSiteImage
// now writes, updates site_images.url, and drops the old object.
//
// Auth: cron secret. Trigger repeatedly after deploy until `remaining` is 0
// (default batch is 40 images/call to stay well under Vercel's function
// duration limit — already-migrated rows are automatically excluded from the
// next call, so there's no cursor to track):
//   curl "https://orbisdei.org/api/backfill-site-image-keys?secret=CRON_SECRET&dryRun=1"          # preview
//   curl "https://orbisdei.org/api/backfill-site-image-keys?secret=CRON_SECRET"                   # apply a batch
//   curl "https://orbisdei.org/api/backfill-site-image-keys?secret=CRON_SECRET&limit=100"          # bigger batch
// Idempotent: images already in the versioned format (or external) are skipped.
export const maxDuration = 60;

const LEGACY_POSITIONAL_KEY = /\/\d{3}\.jpg(?:[?#]|$)/i;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 40, 200);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: images, error } = await supabase
    .from('site_images')
    .select('id, site_id, url');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const legacy = (images ?? []).filter(
    (img) => isR2Url(img.url) && LEGACY_POSITIONAL_KEY.test(img.url)
  );
  const batch = legacy.slice(0, limit);

  const results: Record<string, unknown>[] = [];
  let backfilled = 0;
  const touchedSiteIds = new Set<string>();

  for (const img of batch) {
    if (dryRun) {
      results.push({ id: img.id, site_id: img.site_id, action: 'would-backfill', from: img.url });
      backfilled++;
      continue;
    }

    try {
      const res = await fetch(img.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      // Upload the same bytes under the new key, then repoint the row. Delete
      // the old object last (best-effort) so a failure can't orphan the row.
      const newUrl = await uploadSiteImage(img.site_id, buf, 'legacy', 'image/jpeg');
      const { error: upErr } = await supabase
        .from('site_images')
        .update({ url: newUrl })
        .eq('id', img.id);
      if (upErr) throw new Error(upErr.message);

      try {
        await deleteSiteImage(img.url);
      } catch (delErr) {
        console.warn(`[backfill] old key delete failed for site_images.id=${img.id}:`, delErr);
      }

      touchedSiteIds.add(img.site_id);
      backfilled++;
      results.push({ id: img.id, site_id: img.site_id, from: img.url, to: newUrl });
    } catch (err) {
      results.push({ id: img.id, site_id: img.site_id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (!dryRun) {
    for (const siteId of touchedSiteIds) revalidateSite(siteId);
  }

  return NextResponse.json({
    dryRun,
    scanned: images?.length ?? 0,
    legacyFound: legacy.length,
    backfilled,
    remaining: legacy.length - batch.length,
    results,
  });
}
