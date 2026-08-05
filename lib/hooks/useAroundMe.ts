'use client';

// Around Me state: whether the mode is on, where the user is, which radius rung
// the ladder settled on, and the resulting distance-sorted sites.
//
// The ordering here is the design: radius is the SCOPE, topics are a filter
// inside it (see useTopicFacets). So this hook returns in-radius sites and the
// caller facets them, never the other way round.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserLocation, useDistanceUnit } from './useUserLocation';
import {
  findNearby,
  RADIUS_LADDER,
  type DistanceUnit,
  type WithDistance,
} from '@orbisdei/shared/src/geo';
import { PUBLIC_LEVELS, type InterestLevel } from '@/lib/interestFilter';

interface Locatable { latitude: number; longitude: number }

export interface AroundMeState<T> {
  /** Around Me mode is on (whether or not a position has resolved yet). */
  active: boolean;
  /** Turn the mode on. Does NOT request location — the caller drives that. */
  enable: () => void;
  /** Leave the mode and restore the browse view. */
  disable: () => void;

  location: ReturnType<typeof useUserLocation>;
  unit: DistanceUnit;

  /** Distance-sorted sites inside the settled radius. Empty until located. */
  results: WithDistance<T>[];
  /** The rung the ladder settled on. `null` = no distance limit. */
  radiusMeters: number | null;
  /** True when the ladder had to climb past the requested radius. */
  expanded: boolean;
  /** The radius the user asked for, before any auto-expansion. */
  requestedRadius: number | null;
  setRequestedRadius: (meters: number | null) => void;

  /**
   * Interest levels Around Me should browse: all of them. A `local` parish 200 m
   * away is precisely what someone standing in a street wants, and the homepage
   * default of global+regional would hide it. Reversible by the caller.
   */
  levelOverride: Set<InterestLevel>;
}

export function useAroundMe<T extends Locatable>(sites: T[]): AroundMeState<T> {
  const router = useRouter();
  const location = useUserLocation();
  const unit = useDistanceUnit();

  const [active, setActive] = useState(false);
  const [requestedRadius, setRequestedRadius] = useState<number | null>(RADIUS_LADDER[0]);

  // Enter the mode from ?near=1, so the URL is shareable and the header's
  // "Around Me" link works from any page — including from the homepage itself,
  // where a client-side navigation re-renders this component without remounting
  // it. Hence no dependency array: this runs after every render and picks the
  // param up whenever it appears.
  //
  // Deliberately one-way (enable only). Syncing both directions would race
  // against `enable()`, which sets state before router.replace has written the
  // param — the effect would read the pre-navigation URL and immediately switch
  // the mode back off.
  //
  // Read from window.location rather than useSearchParams() for the same reason
  // as ?levels= and ?topics=: that hook would force this subtree to client-side
  // rendering and push the homepage's LCP image out of the prerendered HTML.
  useEffect(() => {
    if (active) return;
    if (new URLSearchParams(window.location.search).get('near') === '1') setActive(true);
  });

  const writeNearParam = useCallback(
    (on: boolean) => {
      const params = new URLSearchParams(window.location.search);
      if (on) params.set('near', '1');
      else { params.delete('near'); params.delete('topics'); }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router],
  );

  const enable = useCallback(() => {
    setActive(true);
    writeNearParam(true);
  }, [writeNearParam]);

  const disable = useCallback(() => {
    setActive(false);
    setRequestedRadius(RADIUS_LADDER[0]);
    writeNearParam(false);
  }, [writeNearParam]);

  const nearby = useMemo(() => {
    if (!active || location.lat === null || location.lng === null) {
      return { results: [] as WithDistance<T>[], radiusMeters: requestedRadius, expanded: false };
    }
    return findNearby(sites, location.lat, location.lng, requestedRadius);
  }, [active, location.lat, location.lng, sites, requestedRadius]);

  const levelOverride = useMemo(() => new Set(PUBLIC_LEVELS), []);

  return {
    active,
    enable,
    disable,
    location,
    unit,
    results: nearby.results,
    radiusMeters: nearby.radiusMeters,
    expanded: nearby.expanded,
    requestedRadius,
    setRequestedRadius,
    levelOverride,
  };
}
