import { revalidatePath, revalidateTag } from 'next/cache';
import { siteTag, tagTag } from '@/lib/data';

// Ringfenced, on-demand cache busting for a single site/tag edit. Unlike
// revalidateTag(SITES_TAG)/revalidateTag(TAGS_TAG) — which fan out across
// every site/tag/homepage/search page in the catalog — these only touch the
// specific site page and the specific tag pages actually affected, so a
// normal one-at-a-time editing session costs a handful of writes instead of
// hundreds. See lib/data.ts for why the catalog-wide tags are reserved for
// aggregate views on a 24h timer fallback.

export function revalidateSite(siteId: string) {
  revalidateTag(siteTag(siteId), 'max');
  revalidatePath(`/site/${siteId}`);
}

export function revalidateTagPage(tagId: string) {
  revalidateTag(tagTag(tagId), 'max');
  revalidatePath(`/tag/${tagId}`);
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
