'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Site, Tag } from '@/lib/types';

export interface SiteCardData {
  site: Site;
  tags: Tag[];
}

// Module-level cache: a site's card data is immutable within a page visit.
const lazyCache = new Map<string, SiteCardData>();

/**
 * Resolve the { site, tags } pair a SiteCard needs for a given site id.
 *
 * Looks in `localSites`/`localTags` first (pages that already hold the data,
 * e.g. homepage, tag pages). When `lazy` is true and the id isn't local, the
 * data is fetched from /api/site-card/[id] — this lets map-heavy pages (site
 * detail) render popups for any pin without shipping the whole catalog in
 * their server payload.
 */
export function useSiteCard(
  siteId: string | null,
  localSites: Site[],
  localTags: Tag[],
  lazy = false,
): SiteCardData | null {
  const local = useMemo(() => {
    if (!siteId) return null;
    const site = localSites.find((s) => s.id === siteId);
    if (!site) return null;
    return { site, tags: localTags.filter((t) => site.tag_ids.includes(t.id)) };
  }, [siteId, localSites, localTags]);

  const [fetched, setFetched] = useState<SiteCardData | null>(null);

  useEffect(() => {
    if (!siteId || local || !lazy) return;
    const cached = lazyCache.get(siteId);
    if (cached) {
      setFetched(cached);
      return;
    }
    let cancelled = false;
    fetch(`/api/site-card/${siteId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SiteCardData | null) => {
        if (data?.site) {
          lazyCache.set(siteId, data);
          if (!cancelled) setFetched(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteId, local, lazy]);

  if (local) return local;
  if (fetched && fetched.site.id === siteId) return fetched;
  return null;
}
