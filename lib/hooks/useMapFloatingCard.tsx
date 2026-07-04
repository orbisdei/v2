'use client';

import { useCallback, useState } from 'react';
import { useSiteCard } from '@/lib/hooks/useSiteCard';
import type { Site, Tag } from '@/lib/types';

/**
 * Manages the "tap a pin → show a SiteFloatingCard at the bottom of the map" pattern.
 * Used by the mobile split view (homepage) AND every fullscreen map overlay so they
 * look and behave identically.
 *
 * Wire the map with `suppressPopups`, `onPinClick={onPinClick}`, and
 * `highlightedSiteId={selectedId}`. Render the `<SiteFloatingCard>` only when `site` is non-null.
 *
 * `opts.lazy`: fetch card data for pins whose site isn't in `allSites` — see
 * useLeafletPopupCard for details.
 */
export function useMapFloatingCard(
  allSites: Site[],
  allTags: Tag[],
  opts?: { lazy?: boolean },
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onPinClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);
  }, []);

  const card = useSiteCard(selectedId, allSites, allTags, opts?.lazy);

  return { selectedId, onPinClick, close, site: card?.site ?? null, tags: card?.tags ?? [] };
}
