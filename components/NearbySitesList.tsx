'use client';

// "Sites near this one", built entirely from the pins the site detail page
// already carries. getNearbyMapPins gives it a ~1.5° box of neighbours for the
// map; this turns that same latent data into a ranked list, which is how one
// visit chains into three.
//
// Those serialized pins deliberately omit descriptions and thumbnails (see the
// MapPin type and the ISR payload rules), so this is a compact name + distance
// list rather than a card grid. Fetching card data per row would mean up to a
// dozen /api/site-card calls for a section most visitors never scroll to.

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import DistanceBadge from './DistanceBadge';
import SiteTypeLabel from './SiteTypeLabel';
import { haversineMeters, type DistanceUnit } from '@/lib/geo';
import type { MapPin } from '@/lib/types';

interface NearbySitesListProps {
  /** All pins in scope, including the current site (filtered out here). */
  pins: MapPin[];
  currentSiteId: string;
  latitude: number;
  longitude: number;
  unit?: DistanceUnit;
  limit?: number;
  /** Only list neighbours within this distance (metres). */
  maxDistanceMeters?: number;
  className?: string;
}

export default function NearbySitesList({
  pins,
  currentSiteId,
  latitude,
  longitude,
  unit = 'km',
  limit = 6,
  maxDistanceMeters = 50000,
  className,
}: NearbySitesListProps) {
  const nearby = useMemo(() => {
    return pins
      .filter(
        (p) =>
          p.id !== currentSiteId &&
          Number.isFinite(p.latitude) &&
          Number.isFinite(p.longitude),
      )
      .map((pin) => ({
        pin,
        distanceMeters: haversineMeters(latitude, longitude, pin.latitude, pin.longitude),
      }))
      .filter((r) => r.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);
  }, [pins, currentSiteId, latitude, longitude, limit, maxDistanceMeters]);

  if (nearby.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Sites near this one
      </h2>
      <div className="flex flex-col">
        {nearby.map(({ pin, distanceMeters }) => (
          <Link
            key={pin.id}
            href={`/site/${pin.id}`}
            prefetch={false}
            className="group flex min-h-[44px] items-center gap-2.5 border-b border-gray-100 py-2 last:border-0"
          >
            <DistanceBadge meters={distanceMeters} unit={unit} />
            <span className="min-w-0 flex-1 truncate font-serif text-[13px] font-semibold text-navy-900 group-hover:text-navy-600">
              {pin.name}
            </span>
            {pin.type && (
              <SiteTypeLabel type={pin.type} size="sm" className="hidden shrink-0 sm:flex" />
            )}
            <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-gray-500" />
          </Link>
        ))}
      </div>
    </section>
  );
}
