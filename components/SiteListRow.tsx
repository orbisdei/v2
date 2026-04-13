'use client';

import Link from 'next/link';
import SiteInlineActions from './SiteInlineActions';
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

  const topicTags = tags.filter(
    (t) => site.tag_ids.includes(t.id) && (t.type === 'topic' || !t.type)
  );

  return (
    <Link
      href={`/site/${site.id}`}
      className="flex gap-2.5 py-2 border-b border-gray-100 last:border-0"
    >
      {/* Thumbnail */}
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

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="font-serif text-[13px] font-semibold text-navy-900 line-clamp-2 leading-tight">
          {site.name}
        </p>
        <div className="flex items-baseline -mt-px">
          <p className="text-[11px] text-gray-500 truncate flex-1 leading-none">{location}</p>
          <SiteInlineActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
        </div>
        {site.short_description && (
          <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
            {site.short_description}
          </p>
        )}
        {topicTags.length > 0 && (
          <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-hide">
            {topicTags.map((tag) => (
              <span key={tag.id} className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-navy-50 text-navy-700 rounded whitespace-nowrap">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
