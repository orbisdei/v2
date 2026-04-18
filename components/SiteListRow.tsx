'use client';

import SiteCard from './SiteCard';
import type { Site, Tag } from '@/lib/types';

interface SiteListRowProps {
  site: Site;
  tags: Tag[];
}

export default function SiteListRow({ site, tags }: SiteListRowProps) {
  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <SiteCard site={site} tags={tags} />
    </div>
  );
}
