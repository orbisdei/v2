'use server';

import { revalidateTag } from 'next/cache';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';
import { pingIndexNow } from '@/lib/indexnow';

export async function revalidateSitesCache() {
  revalidateTag(SITES_TAG, 'max');
  revalidateTag(TAGS_TAG, 'max');
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
