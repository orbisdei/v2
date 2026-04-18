'use server';

import { revalidateTag } from 'next/cache';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';

export async function revalidateSitesCache() {
  revalidateTag(SITES_TAG, 'max');
  revalidateTag(TAGS_TAG, 'max');
}
