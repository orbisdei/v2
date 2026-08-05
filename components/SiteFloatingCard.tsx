'use client';

import SiteCard from './SiteCard';
import type { DistanceUnit } from '@/lib/geo';
import type { Site, Tag } from '@/lib/types';

interface SiteFloatingCardProps {
  site: Site;
  tags: Tag[]; // all tags for this site (pre-filtered by site.tag_ids)
  onClose: () => void;
  distanceMeters?: number;
  distanceUnit?: DistanceUnit;
}

export default function SiteFloatingCard({
  site, tags, onClose, distanceMeters, distanceUnit,
}: SiteFloatingCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2.5">
      <SiteCard
        site={site}
        tags={tags}
        onClose={onClose}
        distanceMeters={distanceMeters}
        distanceUnit={distanceUnit}
      />
    </div>
  );
}
