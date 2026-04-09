'use client';

import Link from 'next/link';
import { X, MapPin } from 'lucide-react';
import VisitedCircle from './VisitedCircle';
import BookmarkCircle from './BookmarkCircle';
import type { Site, Tag } from '@/lib/types';

interface SitePinCardProps {
  site: Site;
  tags: Tag[];
  onClose: () => void;
}

export default function SitePinCard({ site, tags, onClose }: SitePinCardProps) {
  const thumbnail = site.images?.[0]?.url;

  return (
    <div className="relative" style={{ padding: '10px 12px 12px' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        style={{ width: 22, height: 22 }}
      >
        <X size={12} className="text-gray-500" />
      </button>

      {/* Top row: thumbnail (optional) + name/actions */}
      <div className="flex gap-[10px] items-start" style={{ marginBottom: 6 }}>
        {thumbnail && (
          <img
            src={thumbnail}
            alt={site.name}
            style={{
              flexShrink: 0,
              width: 90,
              height: 90,
              objectFit: 'cover',
              objectPosition: 'center',
              borderRadius: 8,
              display: 'block',
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {/* Name + buttons */}
        <div className="flex-1 min-w-0 pr-6">
          <p
            className="font-serif text-navy-900"
            style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}
          >
            {site.name}
          </p>

          {/* Visited · Bookmark · Directions */}
          <div className="flex items-center" style={{ gap: 6, marginTop: 6 }}>
            <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', flexShrink: 0 }}>
              <VisitedCircle siteId={site.id} />
            </div>
            <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', flexShrink: 0 }}>
              <BookmarkCircle siteId={site.id} siteName={site.name} thumbnailUrl={thumbnail} />
            </div>
            {site.google_maps_url && (
              <a
                href={site.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-navy-700 hover:bg-navy-50 transition-colors"
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  height: 28,
                  borderRadius: 14,
                  border: '1.5px solid #1e1e5f',
                  paddingLeft: 8,
                  paddingRight: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                <MapPin size={11} />
                Directions
              </a>
            )}
          </div>

          {/* View more details */}
          <Link
            href={`/site/${site.id}`}
            className="text-navy-700 hover:text-navy-500 font-medium"
            style={{ fontSize: 11, marginTop: 6, display: 'block' }}
          >
            View more details →
          </Link>
        </div>
      </div>

      {/* Description — 3-line clamp */}
      <p
        className="text-gray-500"
        style={{
          fontSize: 12,
          lineHeight: 1.45,
          marginTop: 8,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {site.short_description}
      </p>

      {/* Tags + More → */}
      <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
        <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto scrollbar-hide">
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.id}`}
              className="shrink-0 text-navy-700 hover:bg-navy-50 transition-colors"
              style={{
                fontSize: 11,
                padding: '3px 8px',
                border: '0.5px solid #ccc',
                borderRadius: 11,
                whiteSpace: 'nowrap',
              }}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
