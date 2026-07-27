import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { siteTag, tagTag } from '@/lib/data';

// Ringfenced, on-demand cache busting for a single site/tag edit. Unlike
// revalidateTag(SITES_TAG)/revalidateTag(TAGS_TAG) — which fan out across
// every site/tag/homepage/search page in the catalog — these only touch the
// specific site page and the specific tag pages actually affected, so a
// normal one-at-a-time editing session costs a handful of writes instead of
// hundreds. See lib/data.ts for why the catalog-wide tags are reserved for
// aggregate views on a 24h timer fallback.
//
// Homepage/search read aggregate caches (getAllSitesSummary, getMapPins,
// getAllTags, ...) that cover every row in one cache entry — there's no way
// to selectively bust "one row" out of those, so a scoped site/tag edit
// intentionally does NOT touch them. Instead, every scoped edit marks
// site_config.catalog_dirty; the hourly /api/revalidate-catalog cron checks
// that flag and only pays for the full-catalog bust when something actually
// changed since the last check (see that route for the read side).
function markCatalogDirty() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  createClient(url, key)
    .from('site_config')
    .upsert({ key: 'catalog_dirty', value: true, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .then(
      () => {},
      () => {}
    );
}

export function revalidateSite(siteId: string) {
  revalidateTag(siteTag(siteId), 'max');
  revalidatePath(`/site/${siteId}`);
  markCatalogDirty();
}

export function revalidateTagPage(tagId: string) {
  revalidateTag(tagTag(tagId), 'max');
  revalidatePath(`/tag/${tagId}`);
  markCatalogDirty();
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
