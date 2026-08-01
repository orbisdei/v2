'use client';

import { useEffect, useState } from 'react';
import type { MapPin } from '@/lib/types';

// Module-level cache + in-flight dedupe: the pin set is the same for every
// site page, so a visitor browsing several of them fetches it at most once.
let cache: MapPin[] | null = null;
let inFlight: Promise<MapPin[] | null> | null = null;

function fetchFullPins(): Promise<MapPin[] | null> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;

  inFlight = fetch('/api/map-pins')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { pins?: MapPin[] } | null) => {
      if (data?.pins) cache = data.pins;
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Site detail pages are prerendered with only the pins near the site itself,
 * so their ISR payload doesn't carry the whole catalog. Interactive maps can
 * be panned and zoomed out though, so once one is actually in play this pulls
 * the full pin set from /api/map-pins (CDN-cached) and swaps it in.
 *
 * Returns `initialPins` until the fetch resolves, so the map always has
 * something to render and never blocks on the network.
 */
export function useFullMapPins(initialPins: MapPin[], enabled: boolean): MapPin[] {
  const [fullPins, setFullPins] = useState<MapPin[] | null>(cache);

  useEffect(() => {
    if (!enabled || fullPins) return;
    let cancelled = false;
    fetchFullPins().then((pins) => {
      if (!cancelled && pins) setFullPins(pins);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, fullPins]);

  return fullPins ?? initialPins;
}

/** True once the viewport is at the `lg` breakpoint, where the sticky
 *  full-height map is rendered. Used to decide whether the full pin set is
 *  worth fetching on mount. */
export function useIsDesktopMap(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
