'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Maximize2, X, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteRowActions from '@/components/SiteRowActions';
import SitePreviewCard from '@/components/SitePreviewCard';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import type { Site, Tag, MapPin } from '@/lib/types';

interface HomePageClientProps {
  allSites: Site[];
  allTags: Tag[];
  featuredSites: Site[];
  mapPins: MapPin[];
}

export default function HomePageClient({
  allSites,
  allTags,
  featuredSites,
  mapPins,
}: HomePageClientProps) {
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Mobile split-view pin selection (inline card)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  // Leaflet popup portals — desktop and fullscreen mobile share the same hook pattern
  const desktopPopup = useLeafletPopupCard(allSites, allTags);
  const fullscreenPopup = useLeafletPopupCard(allSites, allTags);

  // Clear fullscreen popup state when exiting fullscreen
  useEffect(() => {
    if (!mapFullscreen) fullscreenPopup.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

  const handleSiteHover = useCallback((id: string | null) => setHoveredSiteId(id), []);
  const handleMobilePinClick = useCallback((id: string) => setSelectedSiteId(id), []);

  const featuredTags = useMemo(() => allTags.filter((t) => t.featured), [allTags]);

  const tagNameById = useMemo(
    () => new Map(allTags.map((t) => [t.id, t.name.toLowerCase()])),
    [allTags]
  );

  const mapSearchResults = useMemo(() => {
    const q = mapSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return allSites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q) ||
          s.tag_ids.some((tid) => tagNameById.get(tid)?.includes(q))
      )
      .slice(0, 6);
  }, [mapSearchQuery, allSites, tagNameById]);

  const mobileSearchResults = useMemo(() => {
    const q = mobileSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return allSites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q) ||
          s.tag_ids.some((tid) => tagNameById.get(tid)?.includes(q))
      )
      .slice(0, 10);
  }, [mobileSearchQuery, allSites, tagNameById]);

  const selectedSite = useMemo(
    () => (selectedSiteId ? allSites.find((s) => s.id === selectedSiteId) ?? null : null),
    [selectedSiteId, allSites]
  );
  const selectedSiteTags = useMemo(
    () => (selectedSite ? allTags.filter((t) => selectedSite.tag_ids.includes(t.id)) : []),
    [selectedSite, allTags]
  );

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── DESKTOP layout (md+): sidebar + map ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <Sidebar
          sites={allSites}
          tags={allTags}
          featuredSites={featuredSites}
          onSiteHover={handleSiteHover}
        />
        <div className="flex-1 relative">
          <MapViewDynamic
            pins={mapPins}
            highlightedSiteId={desktopPopup.highlightedPinId ?? hoveredSiteId}
            onPopupOpen={desktopPopup.onPopupOpen}
            onPopupClose={desktopPopup.onPopupClose}
          />
        </div>
      </div>

      {/* Desktop popup portal */}
      {desktopPopup.portal}

      {/* ── MOBILE layout (<md): map top + scrollable content below ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">

        {/* Map */}
        <div className="relative shrink-0 h-[33dvh] z-[1]">
          <MapViewDynamic
            pins={mapPins}
            initialZoom={1}
            minZoom={1}
            suppressPopups
            highlightedSiteId={selectedSiteId}
            onPinClick={handleMobilePinClick}
          />
          <button
            className="absolute top-3 right-3 z-[40] bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md"
            onClick={() => setMapFullscreen(true)}
            aria-label="Expand map fullscreen"
          >
            <Maximize2 size={18} className="text-navy-700" />
          </button>
        </div>

        {/* Drag handle */}
        <div className="shrink-0 flex justify-center pt-2 pb-1 bg-white">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Inline preview card — shown when a pin is tapped, flush below divider */}
        {selectedSite && (
          <div className="shrink-0 border-b border-gray-200" style={{ background: '#f5f5fa' }}>
            <SitePreviewCard
              site={selectedSite}
              tags={selectedSiteTags}
              onClose={() => setSelectedSiteId(null)}
            />
          </div>
        )}

        {/* Static header: tagline + search */}
        <div className="shrink-0 bg-white px-4 pb-3 space-y-3 pt-3">
          <p className="text-sm italic font-serif text-gray-500 leading-snug">
            Orbis Dei is your guide for discovering holy places around the world.
          </p>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by location or topic…"
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-transparent"
            />
            {mobileSearchQuery && (
              <button
                onClick={() => setMobileSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {mobileSearchResults && (
            <p className="text-xs text-gray-500">
              {mobileSearchResults.length} result{mobileSearchResults.length !== 1 && 's'}
            </p>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {mobileSearchResults ? (
            <div className="px-4 pb-8">
              {mobileSearchResults.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No sites found for &ldquo;{mobileSearchQuery}&rdquo;
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {mobileSearchResults.map((site) => (
                    <Link
                      key={site.id}
                      href={`/site/${site.id}`}
                      className="flex items-center gap-3 py-3 min-h-[44px] group"
                    >
                      {site.images[0] ? (
                        <img
                          src={site.images[0].url}
                          alt={site.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-navy-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                          {site.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{site.short_description}</p>
                      </div>
                      <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                  Featured topics
                </h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-4 pr-6">
                  {featuredTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tag/${tag.id}`}
                      className="inline-flex items-center shrink-0 min-h-[44px] px-4 text-sm font-medium border border-gray-200 rounded-full hover:bg-navy-50 hover:border-navy-300 transition-colors text-navy-800 whitespace-nowrap"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-8">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Featured sites
                </h3>
                <div className="flex flex-col divide-y divide-gray-100">
                  {featuredSites.map((site) => (
                    <Link
                      key={site.id}
                      href={`/site/${site.id}`}
                      className="flex items-center gap-3 py-3 min-h-[44px] group"
                    >
                      {site.images[0] ? (
                        <img
                          src={site.images[0].url}
                          alt={site.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-navy-100 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                          {site.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">{site.short_description}</p>
                      </div>
                      <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile fullscreen map overlay */}
      {mapFullscreen && (
        <div className="md:hidden fixed inset-0 z-50">
          <MapViewDynamic
            pins={mapPins}
            highlightedSiteId={fullscreenPopup.highlightedPinId}
            onPopupOpen={fullscreenPopup.onPopupOpen}
            onPopupClose={fullscreenPopup.onPopupClose}
          />
          <div className="absolute top-0 left-0 right-0 z-[500] p-3 flex items-center gap-2">
            <button
              onClick={() => { setMapFullscreen(false); setMapSearchQuery(''); }}
              className="bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md shrink-0"
              aria-label="Close fullscreen map"
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
                      className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
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

      {/* Fullscreen popup portal */}
      {fullscreenPopup.portal}
    </div>
  );
}
