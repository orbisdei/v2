'use client';

import SiteCard from './SiteCard';
import type { Site, Tag } from '@/lib/types';

interface SiteListRowProps {
  site: Site;
  tags: Tag[];
  /** Eager-load the thumbnail (set on the first row so it can be the LCP image). */
  priority?: boolean;
}

export default function SiteListRow({ site, tags, priority = false }: SiteListRowProps) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <SiteCard site={site} tags={tags} priority={priority} />
    </div>
  );
}
