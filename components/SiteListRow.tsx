'use client';

import Link from 'next/link';
import SiteThumbnailActions from './SiteThumbnailActions';
import SiteTextBlock from './SiteTextBlock';
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
      {/* Thumbnail + action strip */}
      <div className="w-24 shrink-0">
        <div className="w-24 h-20 rounded-t-lg overflow-hidden bg-navy-100">
          {site.images[0] ? (
            <img src={site.images[0].url} alt={site.name} className="w-full h-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <SiteThumbnailActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} googleMapsUrl={site.google_maps_url} />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <SiteTextBlock
          name={site.name}
          location={location}
          description={site.short_description}
        />
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
