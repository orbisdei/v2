import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { siteTag, tagTag, CATALOG_TAG } from '@/lib/data';

// Ringfenced, on-demand cache busting for a single site/tag edit. Unlike
// revalidateTag(SITES_TAG)/revalidateTag(TAGS_TAG) — which fan out across
// every site/tag/homepage/search page in the catalog — these only touch the
// specific site page and the specific tag pages actually affected, so a
// normal one-at-a-time editing session costs a handful of writes instead of
// hundreds. See lib/data.ts for why the catalog-wide tags are reserved for
// aggregate views on a 24h timer fallback.
//
// Homepage/search read getCatalogSitesSummary/getCatalogTags — dedicated
// cache entries covering every row in one cache slot, so there's no way to
// selectively bust "one row" out of them. Rather than a scheduled cron (Vercel
// Hobby only allows daily crons, so an hourly job isn't available at all),
// each scoped edit checks how long it's been since the catalog was last
// busted and fires revalidateTag(CATALOG_TAG) itself if that's over an hour —
// self-throttling via a timestamp in site_config. An edit right after a
// recent bust is a no-op here (cheap read, no write); an edit an hour or more
// after the last bust pays for exactly one CATALOG_TAG revalidation. No edits
// at all in an hour means this never runs, so a quiet stretch costs nothing.
const CATALOG_MIN_INTERVAL_MS = 60 * 60 * 1000;

function maybeRevalidateCatalog() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const supabase = createClient(url, key);

  supabase
    .from('site_config')
    .select('value')
    .eq('key', 'catalog_last_revalidated_at')
    .maybeSingle()
    .then(({ data }) => {
      const last = typeof data?.value === 'string' ? Date.parse(data.value) : 0;
      if (Date.now() - last < CATALOG_MIN_INTERVAL_MS) return;

      revalidateTag(CATALOG_TAG, 'max');
      supabase
        .from('site_config')
        .upsert(
          { key: 'catalog_last_revalidated_at', value: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .then(
          () => {},
          () => {}
        );
    }, () => {});
}

export function revalidateSite(siteId: string) {
  revalidateTag(siteTag(siteId), 'max');
  revalidatePath(`/site/${siteId}`);
  maybeRevalidateCatalog();
}

export function revalidateTagPage(tagId: string) {
  revalidateTag(tagTag(tagId), 'max');
  revalidatePath(`/tag/${tagId}`);
  maybeRevalidateCatalog();
}

/**
 * Call when a site's own fields or its tag assignments changed. `tagIds`
 * should include every tag the site is (or was) linked to — union the
 * before-edit and after-edit tag lists so a removed tag's page also drops
 * the site from its listing, not just an added tag's page picking it up.
 */
export function revalidateSiteAndTags(siteId: string, tagIds: Iterable<string>) {
  revalidateSite(siteId);
  const seen = new Set<string>();
  for (const tagId of tagIds) {
    if (seen.has(tagId)) continue;
    seen.add(tagId);
    revalidateTagPage(tagId);
  }
}
