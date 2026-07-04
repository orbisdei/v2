'use client';

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import SiteCard from '@/components/SiteCard';
import { useSiteCard } from '@/lib/hooks/useSiteCard';
import type { Site, Tag, MapPin } from '@/lib/types';

/**
 * Manages a Leaflet popup portal that renders the shared SiteCard.
 * Pass onPopupOpen / onPopupClose to the MapView(Dynamic) component.
 * Render `portal` somewhere in the JSX tree to mount the card into the popup.
 *
 * `opts.lazy`: when the clicked pin's site isn't in `allSites`, fetch its card
 * data from /api/site-card/[id] instead. Lets pages pass only the sites they
 * already have (e.g. just the current site on detail pages) rather than the
 * whole catalog.
 */
export function useLeafletPopupCard(
  allSites: Site[],
  allTags: Tag[],
  opts?: { lazy?: boolean },
) {
  const [popupEl, setPopupEl] = useState<HTMLElement | null>(null);
  const [popupPin, setPopupPin] = useState<MapPin | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  const onPopupOpen = useCallback((el: HTMLElement, pin: MapPin, close: () => void) => {
    setPopupEl(el);
    setPopupPin(pin);
    closeRef.current = close;
  }, []);

  const onPopupClose = useCallback(() => {
    setPopupEl(null);
    setPopupPin(null);
    closeRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setPopupEl(null);
    setPopupPin(null);
    closeRef.current = null;
  }, []);

  const card = useSiteCard(popupPin?.id ?? null, allSites, allTags, opts?.lazy);

  const portal =
    popupEl && card
      ? createPortal(
          <div className="p-3">
            <SiteCard site={card.site} tags={card.tags} size="md" onClose={() => closeRef.current?.()} />
          </div>,
          popupEl
        )
      : null;

  return {
    onPopupOpen,
    onPopupClose,
    clear,
    /** ID of the currently open popup's pin — use as highlightedSiteId on the map */
    highlightedPinId: popupPin?.id ?? null,
    portal,
  };
}
