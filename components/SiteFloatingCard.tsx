'use client';

import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import SiteInlineActions from './SiteInlineActions';
import type { Site, Tag } from '@/lib/types';
import { getCountryName } from '@/lib/countries';

interface SiteFloatingCardProps {
  site: Site;
  tags: Tag[]; // all tags for this site (pre-filtered by site.tag_ids)
  onClose: () => void;
}

export default function SiteFloatingCard({ site, tags, onClose }: SiteFloatingCardProps) {
  const thumbnail = site.images?.[0]?.url;

  const locationParts = [
    site.municipality,
    site.country ? getCountryName(site.country) : undefined,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  const topicTags = tags.filter((t) => !t.type || t.type === 'topic');
  const visibleTags = topicTags.slice(0, 3);
  const extraCount = topicTags.length - visibleTags.length;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2.5 relative">
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
        style={{ width: 22, height: 22 }}
      >
        <X size={11} className="text-gray-500" />
      </button>

      {/* Top row: thumbnail + text */}
      <div className="flex gap-2.5 items-start">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-navy-100 shrink-0 flex items-center justify-center">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={site.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Plus size={20} className="text-navy-300" />
          )}
        </div>

        {/* Name + location + description */}
        <div className="flex-1 min-w-0 pr-5">
          <p className="font-serif text-[13px] font-semibold text-navy-900 line-clamp-2 leading-snug">
            {site.name}
          </p>
          <div className="flex items-center mt-0.5">
            <p className="text-[11px] text-gray-500 truncate flex-1">{location}</p>
            <SiteInlineActions siteId={site.id} siteName={site.name} thumbnailUrl={thumbnail} />
          </div>
          {site.short_description && (
            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed mt-1">
              {site.short_description}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: tags + View details link */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
          {visibleTags.map((tag) => (
            <span key={tag.id} className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-navy-50 text-navy-700 rounded whitespace-nowrap">
              {tag.name}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-navy-50 text-navy-700 rounded whitespace-nowrap">
              +{extraCount}
            </span>
          )}
        </div>
        <Link
          href={`/site/${site.id}`}
          className="text-[11px] font-semibold text-navy-700 shrink-0"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}
