'use client';

import Link from 'next/link';
import { X, MapPin } from 'lucide-react';
import VisitedCircle from './VisitedCircle';
import BookmarkCircle from './BookmarkCircle';
import type { Site, Tag } from '@/lib/types';

interface Props {
  site: Site;
  tags: Tag[];
  onClose: () => void;
}

export default function MobilePinPreviewCard({ site, tags, onClose }: Props) {
  const thumbnail = site.images[0]?.url;

  return (
    <div className="flex-1 bg-white overflow-hidden">
      {/* Card */}
      <div className="mx-3 mt-3 rounded-[12px] overflow-hidden relative"
        style={{ background: '#f8f8fc', border: '1px solid #e0e0f0', padding: '10px 12px 12px' }}>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-2 right-2 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          style={{ width: 22, height: 22, flexShrink: 0 }}
        >
          <X size={12} className="text-gray-500" />
        </button>

        {/* Top row: thumbnail + name + action buttons */}
        <div className="flex gap-[10px] items-start">
          {/* Thumbnail */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={site.name}
              className="shrink-0 object-cover"
              style={{ width: 90, height: 90, borderRadius: 8 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className="shrink-0 bg-navy-800 flex items-center justify-center"
              style={{ width: 90, height: 90, borderRadius: 8 }}
            >
              <span className="text-white text-xl">✙</span>
            </div>
          )}

          {/* Name + action buttons */}
          <div className="flex-1 min-w-0 pr-6">
            <p
              className="font-serif text-navy-900"
              style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.25 }}
            >
              {site.name}
            </p>

            {/* Visited, Bookmark, Directions */}
            <div className="flex items-center mt-0.5">
              <VisitedCircle siteId={site.id} />
              <BookmarkCircle siteId={site.id} siteName={site.name} thumbnailUrl={thumbnail} />
              {site.google_maps_url && (
                <a
                  href={site.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-navy-700 hover:bg-navy-50 transition-colors"
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
          </div>
        </div>

        {/* Description — 3-line clamp */}
        <p
          className="text-gray-500 mt-2"
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {site.short_description}
        </p>

        {/* Tags + More → */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto scrollbar-hide">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.id}`}
                className="shrink-0 text-navy-700 hover:bg-navy-50 transition-colors"
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  border: '0.5px solid #ccc',
                  borderRadius: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
          <Link
            href={`/site/${site.id}`}
            className="shrink-0 text-navy-700 hover:text-navy-500 font-medium"
            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
          >
            More →
          </Link>
        </div>
      </div>
    </div>
  );
}
