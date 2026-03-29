'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Map, X, Search } from 'lucide-react';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteRowActions from '@/components/SiteRowActions';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import type { Site, Tag, MapPin } from '@/lib/types';

interface TagPageClientProps {
  tag: Tag;
  sites: Site[];
  pins: MapPin[];
  allTags: Tag[];
  creatorName: string | null;
  childTags: (Tag & { site_count: number })[];
  parentTag: Tag | null;
  grandparentTag: Tag | null;
}

export default function TagPageClient({ tag, sites, pins, allTags, creatorName, childTags, parentTag, grandparentTag }: TagPageClientProps) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  const popup = useLeafletPopupCard(sites, allTags);

  // Clear popup state when fullscreen map closes
  useEffect(() => {
    if (!mapFullscreen) popup.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

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
      <div className="md:hidden flex flex-col h-[calc(100dvh-56px)]">

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

          {/* Breadcrumb */}
          {(parentTag || grandparentTag) && (
            <div className="flex items-center gap-1 text-[11px] text-gray-400 px-[14px] pt-[4px]">
              {grandparentTag && (
                <>
                  <Link href={`/tag/${grandparentTag.id}`} className="hover:text-navy-600">{grandparentTag.name}</Link>
                  <ChevronRight size={10} />
                </>
              )}
              {parentTag && (
                <>
                  <Link href={`/tag/${parentTag.id}`} className="hover:text-navy-600">{parentTag.name}</Link>
                  <ChevronRight size={10} />
                </>
              )}
              <span className="text-gray-500">{tag.name}</span>
            </div>
          )}

          {/* 4. Topic description */}
          <p className="text-[13px] text-gray-500 leading-[1.55] px-[14px] pt-[6px]">
            {tag.description}
          </p>

          {/* Child location tags */}
          {childTags.length > 0 && (
            <div className="px-[14px] pt-[10px]">
              {(() => {
                const regions = childTags.filter((t) => t.type === 'region');
                const municipalities = childTags.filter((t) => t.type === 'municipality');
                return (
                  <>
                    {regions.length > 0 && (
                      <div className="mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Regions</h3>
                        <div className="flex flex-wrap gap-1">
                          {regions.map((child) => (
                            <Link
                              key={child.id}
                              href={`/tag/${child.id}`}
                              className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              {child.name}
                              <span className="ml-1 text-blue-400">({child.site_count})</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {municipalities.length > 0 && (
                      <div className="mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Cities</h3>
                        <div className="flex flex-wrap gap-1">
                          {municipalities.map((child) => (
                            <Link
                              key={child.id}
                              href={`/tag/${child.id}`}
                              className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              {child.name}
                              <span className="ml-1 text-blue-400">({child.site_count})</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
            <MapViewDynamic
              pins={pins}
              initialFitBounds
              highlightedSiteId={popup.highlightedPinId}
              onPopupOpen={popup.onPopupOpen}
              onPopupClose={popup.onPopupClose}
            />

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
      <div className="hidden md:flex flex-col lg:flex-row min-h-[calc(100dvh-56px)]">

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

            {/* Breadcrumb */}
            {(parentTag || grandparentTag) && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                {grandparentTag && (
                  <>
                    <Link href={`/tag/${grandparentTag.id}`} className="hover:text-navy-600">{grandparentTag.name}</Link>
                    <ChevronRight size={10} />
                  </>
                )}
                {parentTag && (
                  <>
                    <Link href={`/tag/${parentTag.id}`} className="hover:text-navy-600">{parentTag.name}</Link>
                    <ChevronRight size={10} />
                  </>
                )}
                <span className="text-gray-500">{tag.name}</span>
              </div>
            )}

            <p className="mt-3 text-gray-700 leading-relaxed">
              {tag.description}
            </p>

            {creatorName && (
              <p className="mt-2 text-xs text-gray-400">Tag added by {creatorName}</p>
            )}

            {/* Child location tags */}
            {childTags.length > 0 && (
              <div className="mt-4 mb-2">
                {(() => {
                  const regions = childTags.filter((t) => t.type === 'region');
                  const municipalities = childTags.filter((t) => t.type === 'municipality');
                  return (
                    <>
                      {regions.length > 0 && (
                        <div className="mb-3">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Regions</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {regions.map((child) => (
                              <Link
                                key={child.id}
                                href={`/tag/${child.id}`}
                                className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                {child.name}
                                <span className="ml-1 text-blue-400">({child.site_count})</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {municipalities.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cities</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {municipalities.map((child) => (
                              <Link
                                key={child.id}
                                href={`/tag/${child.id}`}
                                className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                {child.name}
                                <span className="ml-1 text-blue-400">({child.site_count})</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
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
                  </div>
                  <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Map */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)]">
          <MapViewDynamic
            pins={pins}
            initialFitBounds
            highlightedSiteId={popup.highlightedPinId}
            onPopupOpen={popup.onPopupOpen}
            onPopupClose={popup.onPopupClose}
          />
        </div>
      </div>

      {popup.portal}
    </>
  );
}
