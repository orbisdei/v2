'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import SiteThumbnailActions from './SiteThumbnailActions';
import SiteTextBlock from './SiteTextBlock';
import { getCountryName } from '@/lib/countries';
import type { Site, Tag } from '@/lib/types';

type Size = 'sm' | 'md';

interface SiteCardProps {
  site: Site;
  tags: Tag[];
  size?: Size;
  /** When provided, shows an X close button overlaid top-right. */
  onClose?: () => void;
}

const GAP_CLS: Record<Size, string> = { sm: 'gap-2.5', md: 'gap-3.5' };

const THUMB_COL_CLS: Record<Size, string> = { sm: 'w-24', md: 'w-32' };
const THUMB_BOX_CLS: Record<Size, string> = { sm: 'w-24 h-20', md: 'w-32 h-28' };

const TAG_CLS: Record<Size, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-[11px] px-2.5 py-1',
};

/** sm: scroll horizontally (touch-friendly); md: wrap (no hidden affordance on desktop). */
const TAGS_CONTAINER_CLS: Record<Size, string> = {
  sm: 'flex gap-1.5 mt-1 overflow-x-auto scrollbar-hide',
  md: 'flex gap-2 mt-2 flex-wrap',
};

export default function SiteCard({ site, tags, size = 'sm', onClose }: SiteCardProps) {
  const locationParts = [
    site.municipality,
    site.country ? getCountryName(site.country) : undefined,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  const topicTags = tags.filter(
    (t) => site.tag_ids.includes(t.id) && (t.type === 'topic' || !t.type)
  );

  const siteHref = `/site/${site.id}`;

  return (
    <div className="relative">
      {onClose && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
          aria-label="Close preview"
          className="absolute top-0 right-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
          style={{ width: 22, height: 22 }}
        >
          <X size={11} className="text-gray-500" />
        </button>
      )}

      <div className={`flex ${GAP_CLS[size]}`}>
        {/* Thumbnail column */}
        <div className={`shrink-0 ${THUMB_COL_CLS[size]}`}>
          <Link href={siteHref} className="block">
            <div className={`rounded-t-lg overflow-hidden bg-navy-100 ${THUMB_BOX_CLS[size]}`}>
              {site.images[0] ? (
                <img src={site.images[0].url} alt={site.name} className="w-full h-full object-cover" loading="lazy" />
              ) : null}
            </div>
          </Link>
          <SiteThumbnailActions
            siteId={site.id}
            siteName={site.name}
            thumbnailUrl={site.images[0]?.url}
            googleMapsUrl={site.google_maps_url}
          />
        </div>

        {/* Text + tag chips */}
        <div className="flex-1 min-w-0">
          <Link href={siteHref} className="block">
            <SiteTextBlock
              name={site.name}
              location={location}
              description={site.short_description}
              size={size}
              className={onClose ? 'pr-6' : ''}
            />
          </Link>
          {topicTags.length > 0 && (
            <div className={TAGS_CONTAINER_CLS[size]}>
              {topicTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.id}`}
                  className={`shrink-0 font-medium bg-navy-50 text-navy-700 hover:bg-navy-100 rounded whitespace-nowrap transition-colors ${TAG_CLS[size]}`}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
