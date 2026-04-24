'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Site, Tag } from '@/lib/types';

/**
 * Manages the "tap a pin → show a SiteFloatingCard at the bottom of the map" pattern.
 * Used by the mobile split view (homepage) AND every fullscreen map overlay so they
 * look and behave identically.
 *
 * Wire the map with `suppressPopups`, `onPinClick={onPinClick}`, and
 * `highlightedSiteId={selectedId}`. Render the `<SiteFloatingCard>` only when `site` is non-null.
 */
export function useMapFloatingCard(allSites: Site[], allTags: Tag[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onPinClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const close = useCallback(() => {
    setSelectedId(null);
  }, []);

  const site = useMemo(
    () => (selectedId ? allSites.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, allSites]
  );

  const tags = useMemo(
    () => (site ? allTags.filter((t) => site.tag_ids.includes(t.id)) : []),
    [site, allTags]
  );

  return { selectedId, onPinClick, close, site, tags };
}
