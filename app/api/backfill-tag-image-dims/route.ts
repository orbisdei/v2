import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { TAGS_TAG } from '@/lib/data';
import { getImageDimensions, uploadTagImage, deleteSiteImage, isR2Url } from '@/lib/storage';
import { parseTagImageDims } from '@/lib/lcpImages';

// One-shot backfill: existing tag images were stored at the old stable key
// (tags/{id}/hero.jpg) with no dimensions in the filename, so the tag page
// can't reserve their box and they still cause CLS. This re-keys each one to
// the versioned, dimension-encoded format (tags/{id}/{ts}-{w}x{h}.jpg) that
// uploadTagImage now writes, updates tags.image_url, and drops the old object.
//
// Auth: cron secret. Trigger once after deploy:
//   curl "https://orbisdei.org/api/backfill-tag-image-dims?secret=CRON_SECRET&dryRun=1"  # preview
//   curl "https://orbisdei.org/api/backfill-tag-image-dims?secret=CRON_SECRET"           # apply
// Idempotent: images already in the new format (or external) are skipped, so
// it's safe to re-run.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tags, error } = await supabase
    .from('tags')
    .select('id, image_url')
    .not('image_url', 'is', null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Record<string, unknown>[] = [];
  let backfilled = 0;

  for (const tag of tags ?? []) {
    const url = tag.image_url as string;
    // Skip external images and ones already in the dimension-encoded format.
    if (!isR2Url(url) || parseTagImageDims(url)) continue;

    if (dryRun) {
      results.push({ id: tag.id, action: 'would-backfill', from: url });
      backfilled++;
      continue;
    }

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const { width, height } = await getImageDimensions(buf);

      // Upload the same bytes under the new key, then repoint the tag. Delete
      // the old object last (best-effort) so a failure can't orphan the tag.
      const newUrl = await uploadTagImage(tag.id, buf, width, height);
      const { error: upErr } = await supabase
        .from('tags')
        .update({ image_url: newUrl })
        .eq('id', tag.id);
      if (upErr) throw new Error(upErr.message);

      try {
        await deleteSiteImage(url);
      } catch (delErr) {
        console.warn(`[backfill] old key delete failed for ${tag.id}:`, delErr);
      }

      backfilled++;
      results.push({ id: tag.id, from: url, to: newUrl, dims: `${width}x${height}` });
    } catch (err) {
      results.push({ id: tag.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (!dryRun && backfilled > 0) {
    revalidateTag(TAGS_TAG, 'max');
  }

  return NextResponse.json({ dryRun, scanned: tags?.length ?? 0, backfilled, results });
}
