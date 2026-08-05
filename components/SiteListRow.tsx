'use client';

import SiteCard from './SiteCard';
import type { DistanceUnit } from '@/lib/geo';
import type { Site, Tag } from '@/lib/types';

interface SiteListRowProps {
  site: Site;
  tags: Tag[];
  /** Eager-load the thumbnail (set on the first row so it can be the LCP image). */
  priority?: boolean;
  distanceMeters?: number;
  distanceUnit?: DistanceUnit;
}

export default function SiteListRow({
  site, tags, priority = false, distanceMeters, distanceUnit,
}: SiteListRowProps) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <SiteCard
        site={site}
        tags={tags}
        priority={priority}
        distanceMeters={distanceMeters}
        distanceUnit={distanceUnit}
      />
    </div>
  );
}
