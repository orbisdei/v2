'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Map, X, Search } from 'lucide-react';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteRowActions from '@/components/SiteRowActions';
import type { Site, Tag, MapPin } from '@/lib/types';

interface TagPageClientProps {
  tag: Tag;
  sites: Site[];
  pins: MapPin[];
  creatorName: string | null;
}

export default function TagPageClient({ tag, sites, pins, creatorName }: TagPageClientProps) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  const mapSearchResults = useMemo(() => {
    const q = mapSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return sites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mapSearchQuery, sites]);

  return (
    <>
      {/* ── MOBILE layout (below md) ── sticky top + scrollable list */}
      <div className="md:hidden flex flex-col h-[calc(100vh-56px)]">

        {/* ── STICKY TOP SECTION ── */}
        <div className="shrink-0 bg-white">

          {/* 2. Hero image (or plain back link) */}
          {tag.image_url ? (
            <div className="relative overflow-hidden bg-gray-200" style={{ height: '150px' }}>
              <img
                src={tag.image_url}
                alt={tag.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-navy-900/40" />
              <div className="absolute top-3 left-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-[13px] text-white font-medium drop-shadow"
                >
                  <ArrowLeft size={14} />
                  Back to search
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-[14px] pt-[10px]">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
              >
                <ArrowLeft size={14} />
                Back to search
              </Link>
            </div>
          )}

          {/* 3. Topic name */}
          <h1 className="font-serif text-[21px] font-medium text-navy-900 leading-snug px-[14px] pt-[12px]">
            {tag.name}
          </h1>

          {/* 4. Topic description */}
          <p className="text-[13px] text-gray-500 leading-[1.55] px-[14px] pt-[6px]">
            {tag.description}
          </p>

          {/* 5. Results count + View on map */}
          <div className="flex items-center justify-between px-[14px] pt-[12px] pb-[8px] border-b border-gray-200">
            <span className="text-[13px] font-semibold text-navy-900">
              {sites.length} {sites.length === 1 ? 'Result' : 'Results'}
            </span>
            <button
              type="button"
              onClick={() => setMapFullscreen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-700 hover:text-navy-500 min-h-[44px]"
            >
              <Map size={14} />
              View on map
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE SECTION ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
          <div className="px-3">
            {sites.map((site, idx) => (
              <Link
                key={site.id}
                href={`/site/${site.id}`}
                className="flex items-center gap-3 py-[10px] min-h-[44px] border-b border-gray-100 last:border-0"
              >
                {/* Index */}
                <span className="text-[12px] text-gray-400 w-4 text-center shrink-0 font-medium">
                  {idx + 1}
                </span>

                {/* Thumbnail */}
                {site.images[0] ? (
                  <img
                    src={site.images[0].url}
                    alt={site.name}
                    className="w-12 h-12 rounded-[6px] object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-[6px] bg-navy-100 shrink-0" />
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-medium text-navy-900 truncate leading-snug">
                    {site.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-[1.4] mt-0.5">
                    {site.short_description}
                  </p>
                  {site.featured && (
                    <span
                      className="inline-block mt-1 rounded text-[9px] font-medium"
                      style={{ background: '#fef8e0', color: '#8a6d0b', padding: '2px 7px' }}
                    >
                      featured
                    </span>
                  )}
                </div>

                {/* Actions + Chevron */}
                <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                <ChevronRight size={15} className="text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Fullscreen map overlay */}
        {mapFullscreen && (
          <div className="fixed inset-0 z-50">
            <MapViewDynamic pins={pins} initialFitBounds />

            {/* Top bar: X close + search */}
            <div className="absolute top-0 left-0 right-0 z-[500] p-3 flex items-center gap-2">
              <button
                onClick={() => { setMapFullscreen(false); setMapSearchQuery(''); }}
                className="bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md shrink-0"
                aria-label="Close map"
              >
                <X size={20} className="text-navy-700" />
              </button>
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search sites…"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
                {mapSearchResults && mapSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                    {mapSearchResults.map((site) => (
                      <Link
                        key={site.id}
                        href={`/site/${site.id}`}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm font-medium text-navy-900 truncate">{site.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {mapSearchResults && mapSearchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3">
                    <span className="text-sm text-gray-500">No results</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP layout (md+) — unchanged ── */}
      <div className="hidden md:flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">

        {/* Left: Tag info + site list */}
        <div className="lg:w-1/2 xl:w-[45%] overflow-y-auto">
          {tag.image_url && (
            <div className="relative h-48 md:h-56 bg-gray-200 overflow-hidden">
              <div className="absolute inset-0 bg-navy-900/40" />
              <div className="absolute top-4 left-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white font-medium"
                >
                  <ArrowLeft size={16} />
                  Back to search
                </Link>
              </div>
            </div>
          )}

          <div className="px-4 md:px-6 py-5">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900">
              {tag.name}
            </h1>
            <p className="mt-3 text-gray-700 leading-relaxed">
              {tag.description}
            </p>

            {creatorName && (
              <p className="mt-2 text-xs text-gray-400">Tag added by {creatorName}</p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-900">
                {sites.length} {sites.length === 1 ? 'Result' : 'Results'}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-1">
              {sites.map((site, idx) => (
                <Link
                  key={site.id}
                  href={`/site/${site.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-400 w-5 shrink-0">
                    {idx + 1}
                  </span>
                  {site.images[0] && (
                    <img
                      src={site.images[0].url}
                      alt={site.name}
                      className="w-14 h-14 object-cover rounded-md shrink-0"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                      {site.name}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {site.short_description}
                    </p>
                    {site.featured && (
                      <span className="text-[10px] text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                        featured
                      </span>
                    )}
                  </div>
                  <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100vh-56px)]">
          <MapViewDynamic pins={pins} initialFitBounds />
        </div>
      </div>
    </>
  );
}
