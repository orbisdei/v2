'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import SiteCard from '@/components/SiteCard';
import type { Site, Tag, MapPin } from '@/lib/types';

/**
 * Manages a Leaflet popup portal that renders the shared SiteCard.
 * Pass onPopupOpen / onPopupClose to the MapView(Dynamic) component.
 * Render `portal` somewhere in the JSX tree to mount the card into the popup.
 */
export function useLeafletPopupCard(allSites: Site[], allTags: Tag[]) {
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

  const site = useMemo(
    () => (popupPin ? allSites.find((s) => s.id === popupPin.id) ?? null : null),
    [popupPin, allSites]
  );

  const tags = useMemo(
    () => (site ? allTags.filter((t) => site.tag_ids.includes(t.id)) : []),
    [site, allTags]
  );

  const portal =
    popupEl && site
      ? createPortal(
          <div className="p-3">
            <SiteCard site={site} tags={tags} size="md" onClose={() => closeRef.current?.()} />
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
