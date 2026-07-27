'use server';

import { revalidateTag } from 'next/cache';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';
import { revalidateSiteAndTags, revalidateTagPage } from '@/lib/revalidate';
import { pingIndexNow } from '@/lib/indexnow';

// Catalog-wide — deliberately expensive, reserved for the admin's explicit
// "Revalidate cache" button. Per-edit call sites should use
// revalidateSiteEdit/revalidateTagEdit below instead, which only bust the
// specific site/tag pages touched.
export async function revalidateSitesCache() {
  revalidateTag(SITES_TAG, 'max');
  revalidateTag(TAGS_TAG, 'max');
}

/** Ringfenced revalidation for a site create/edit: its own page + every tag it's linked to (including removed tags). */
export async function revalidateSiteEdit(siteId: string, tagIds: string[]) {
  revalidateSiteAndTags(siteId, tagIds);
}

/** Ringfenced revalidation for a tag create/edit: just that tag's page. */
export async function revalidateTagEdit(tagId: string) {
  revalidateTagPage(tagId);
}

// Server action wrapper so client-side create flows (ContributeClient,
// AdminClient approvals) can ping IndexNow — the endpoint can't be called
// from the browser. Paths are validated because server actions are
// externally invokable.
export async function notifyIndexNow(paths: string[]) {
  const valid = paths
    .filter((p) => typeof p === 'string' && (p.startsWith('/site/') || p.startsWith('/tag/')))
    .slice(0, 50);
  await pingIndexNow(valid);
}
