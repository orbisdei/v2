'use client';

import Link from 'next/link';
import VisitedCircle from './VisitedCircle';
import BookmarkCircle from './BookmarkCircle';
import { getCountryName } from '@/lib/countries';
import type { Site, Tag } from '@/lib/types';

interface SiteListRowProps {
  site: Site;
  tags: Tag[];
}

export default function SiteListRow({ site, tags }: SiteListRowProps) {
  const locationParts = [
    site.municipality,
    site.country ? getCountryName(site.country) : undefined,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  const topicTag = tags.find(
    (t) => site.tag_ids.includes(t.id) && (t.type === 'topic' || !t.type)
  );

  return (
    <Link
      href={`/site/${site.id}`}
      className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0"
    >
      {/* Thumbnail + icons below */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-navy-100 shrink-0">
          {site.images[0] ? (
            <img
              src={site.images[0].url}
              alt={site.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        {/* Action icons below thumbnail, scaled down */}
        <div className="flex items-center scale-[0.72] origin-top" style={{ marginTop: '-4px' }}>
          <VisitedCircle siteId={site.id} />
          <BookmarkCircle siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-serif text-[13px] font-semibold text-navy-900 line-clamp-2 leading-snug">
          {site.name}
        </p>
        {location && (
          <p className="text-[11px] text-gray-500 mt-0.5">{location}</p>
        )}
        {site.short_description && (
          <p className="text-[11px] text-gray-600 mt-1 line-clamp-2 leading-relaxed">
            {site.short_description}
          </p>
        )}
        {topicTag && (
          <span className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 bg-navy-50 text-navy-700 rounded">
            {topicTag.name}
          </span>
        )}
      </div>
    </Link>
  );
}
