'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Maximize2, X, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteFloatingCard from '@/components/SiteFloatingCard';
import InterestFilter from '@/components/InterestFilter';
import SiteGridCard from '@/components/SiteGridCard';
import SiteListRow from '@/components/SiteListRow';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import {
  type InterestLevel,
  filterByInterest,
  filterPinsBySiteIds,
  stripPersonalSites,
  getAvailableLevels,
} from '@/lib/interestFilter';
import type { Site, Tag, MapPin } from '@/lib/types';

interface HomePageClientProps {
  allSites: Site[];
  allTags: Tag[];
  featuredSites: Site[];
  mapPins: MapPin[];
  appSettings: Record<string, unknown>;
  userRole?: string | null;
}

export default function HomePageClient({
  allSites,
  allTags,
  featuredSites,
  mapPins,
  appSettings,
  userRole,
}: HomePageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  // Mobile split-view pin selection
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [cardSiteId, setCardSiteId] = useState<string | null>(null);
  const [cardVisible, setCardVisible] = useState(false);

  // Mobile view toggle and filter panel
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const [filterOpen, setFilterOpen] = useState(false);

  // Leaflet popup portals
  const desktopPopup = useLeafletPopupCard(allSites, allTags);
  const fullscreenPopup = useLeafletPopupCard(allSites, allTags);

  useEffect(() => {
    if (!mapFullscreen) fullscreenPopup.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

  // ── Interest filter ──────────────────────────────────────────────────────────

  const availableLevels = useMemo(() => getAvailableLevels(userRole), [userRole]);

  const defaultLevels = useMemo((): InterestLevel[] => {
    const fromSettings = appSettings?.homepage_default_levels;
    if (Array.isArray(fromSettings)) return fromSettings as InterestLevel[];
    return ['global', 'regional'];
  }, [appSettings]);

  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(() => {
    const param = searchParams.get('levels');
    if (param) {
      const parsed = param
        .split(',')
        .filter((l) => availableLevels.includes(l as InterestLevel)) as InterestLevel[];
      if (parsed.length > 0) return new Set(parsed);
    }
    return new Set(defaultLevels);
  });

  const handleFilterChange = useCallback(
    (levels: Set<InterestLevel>) => {
      setActiveLevels(levels);
      const sorted = [...levels].sort(
        (a, b) =>
          (['global', 'regional', 'local', 'personal'] as InterestLevel[]).indexOf(a) -
          (['global', 'regional', 'local', 'personal'] as InterestLevel[]).indexOf(b)
      );
      const params = new URLSearchParams(searchParams.toString());
      params.set('levels', sorted.join(','));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const strippedAllSites = useMemo(
    () => stripPersonalSites(allSites, userRole),
    [allSites, userRole]
  );

  const visibleSites = useMemo(
    () => filterByInterest(strippedAllSites, activeLevels),
    [strippedAllSites, activeLevels]
  );

  const visiblePinIds = useMemo(() => new Set(visibleSites.map((s) => s.id)), [visibleSites]);

  const visiblePins = useMemo(
    () => filterPinsBySiteIds(mapPins, visiblePinIds),
    [mapPins, visiblePinIds]
  );

  const visibleFeaturedSites = useMemo(() => {
    const stripped = stripPersonalSites(featuredSites, userRole);
    return filterByInterest(stripped, activeLevels);
  }, [featuredSites, userRole, activeLevels]);

  // Whether active filter differs from defaults (for dot indicator)
  const isFilterActive = useMemo(() => {
    if (activeLevels.size !== defaultLevels.length) return true;
    return defaultLevels.some((l) => !activeLevels.has(l));
  }, [activeLevels, defaultLevels]);

  // Sites shown in map-view 2-up grid (featured, padded to 4–6)
  const gridSites = useMemo(() => {
    if (visibleFeaturedSites.length >= 4) return visibleFeaturedSites;
    const featuredIds = new Set(visibleFeaturedSites.map((s) => s.id));
    const extra = visibleSites.filter((s) => !featuredIds.has(s.id));
    return [...visibleFeaturedSites, ...extra].slice(0, 6);
  }, [visibleFeaturedSites, visibleSites]);

  // Sites shown in list view (featured first, then rest)
  const listSites = useMemo(() => {
    const featuredIds = new Set(visibleFeaturedSites.map((s) => s.id));
    const nonFeatured = visibleSites.filter((s) => !featuredIds.has(s.id));
    return [...visibleFeaturedSites, ...nonFeatured];
  }, [visibleFeaturedSites, visibleSites]);

  // ── Other handlers ───────────────────────────────────────────────────────────

  const handleSiteHover = useCallback((id: string | null) => setHoveredSiteId(id), []);

  const handleMobilePinClick = useCallback((id: string) => {
    setSelectedSiteId(id);
    setCardSiteId(id);
    setCardVisible(true);
  }, []);

  const handleCardClose = useCallback(() => {
    setCardVisible(false);
    setSelectedSiteId(null);
    setTimeout(() => setCardSiteId(null), 260);
  }, []);

  const featuredTags = useMemo(
    () => allTags.filter((t) => t.featured && (!t.type || t.type === 'topic')),
    [allTags]
  );

  const tagNameById = useMemo(
    () => new Map(allTags.map((t) => [t.id, t.name.toLowerCase()])),
    [allTags]
  );

  // Search against all stripped sites (not filtered), so interest filter doesn't restrict search
  const mapSearchResults = useMemo(() => {
    const q = mapSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return strippedAllSites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q) ||
          s.tag_ids.some((tid) => tagNameById.get(tid)?.includes(q))
      )
      .slice(0, 6);
  }, [mapSearchQuery, strippedAllSites, tagNameById]);

  const mobileSearchResults = useMemo(() => {
    const q = mobileSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return strippedAllSites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q) ||
          s.tag_ids.some((tid) => tagNameById.get(tid)?.includes(q))
      )
      .slice(0, 10);
  }, [mobileSearchQuery, strippedAllSites, tagNameById]);

  const cardSite = useMemo(
    () => (cardSiteId ? allSites.find((s) => s.id === cardSiteId) ?? null : null),
    [cardSiteId, allSites]
  );
  const cardSiteTags = useMemo(
    () => (cardSite ? allTags.filter((t) => cardSite.tag_ids.includes(t.id)) : []),
    [cardSite, allTags]
  );

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── DESKTOP layout (md+): sidebar + map ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <Sidebar
          sites={visibleSites}
          tags={allTags}
          featuredSites={visibleFeaturedSites}
          onSiteHover={handleSiteHover}
        />
        <div className="flex-1 relative">
          <MapViewDynamic
            pins={visiblePins}
            initialZoom={2}
            highlightedSiteId={desktopPopup.highlightedPinId ?? hoveredSiteId}
            onPopupOpen={desktopPopup.onPopupOpen}
            onPopupClose={desktopPopup.onPopupClose}
          />
          {/* Interest filter — floating on map, top-left */}
          <div className="absolute top-3 left-3 z-[400]">
            <InterestFilter
              activeLevels={activeLevels}
              onChange={handleFilterChange}
              availableLevels={availableLevels}
              totalCount={strippedAllSites.length}
              filteredCount={visibleSites.length}
            />
          </div>
        </div>
      </div>

      {/* Desktop popup portal */}
      {desktopPopup.portal}

      {/* ── MOBILE layout (<md): Map/List toggle ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">

        {mobileView === 'map' ? (
          /* ── MAP VIEW ── */
          <>
            {/* Map — fixed height */}
            <div className="h-[38dvh] shrink-0 relative z-[1]">
              <MapViewDynamic
                pins={visiblePins}
                initialZoom={1}
                minZoom={1}
                suppressPopups
                highlightedSiteId={selectedSiteId}
                onPinClick={handleMobilePinClick}
              />
              {/* Expand button */}
              <button
                className="absolute top-3 right-3 z-[40] bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md"
                onClick={() => setMapFullscreen(true)}
                aria-label="Expand map fullscreen"
              >
                <Maximize2 size={18} className="text-navy-700" />
              </button>
              {/* Map/List toggle — floating bottom-center (hidden when card is open) */}
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[39] transition-opacity duration-150 ${cardVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex rounded-full overflow-hidden border border-navy-200 shadow-md bg-white text-sm font-medium">
                  <button
                    onClick={() => setMobileView('map')}
                    className="px-4 py-1.5 bg-navy-900 text-white transition-colors"
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setMobileView('list')}
                    className="px-4 py-1.5 text-navy-700 transition-colors"
                  >
                    List
                  </button>
                </div>
              </div>

              {/* Floating pin preview card */}
              {cardSiteId && cardSite && (
                <div className={`absolute bottom-2 left-2.5 right-2.5 z-[40] transition-all duration-200 ease-out ${
                  cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}>
                  <SiteFloatingCard site={cardSite} tags={cardSiteTags} onClose={handleCardClose} />
                </div>
              )}
            </div>

            {/* Content panel — always visible */}
            <div
              className="flex-1 overflow-hidden bg-white"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="h-full overflow-y-auto overscroll-contain">
                  {/* Search bar */}
                  <div className="px-3.5 pt-3 pb-2">
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
                          aria-label="Clear search"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {mobileSearchResults && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        {mobileSearchResults.length} result{mobileSearchResults.length !== 1 && 's'}
                      </p>
                    )}
                  </div>

                  {mobileSearchResults ? (
                    /* Search results */
                    <div className="px-3.5 pb-6">
                      {mobileSearchResults.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          No sites found for &ldquo;{mobileSearchQuery}&rdquo;
                        </p>
                      ) : (
                        <div className="flex flex-col divide-y divide-gray-100">
                          {mobileSearchResults.map((site) => (
                            <SiteListRow key={site.id} site={site} tags={allTags} />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Featured content — topic pills + 2-up grid */
                    <>
                      <div className="mb-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3.5">Featured Topics</h3>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-3.5">
                          {featuredTags.map((tag) => (
                            <Link
                              key={tag.id}
                              href={`/tag/${tag.id}`}
                              className="inline-flex items-center shrink-0 min-h-[36px] px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-navy-50 hover:border-navy-300 transition-colors text-navy-800 whitespace-nowrap"
                            >
                              {tag.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="px-3.5 pb-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Featured sites
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {gridSites.map((site) => (
                            <SiteGridCard key={site.id} site={site} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
            </div>
          </>
        ) : (
          /* ── LIST VIEW ── */
          <>
            {/* Header row */}
            <div className="shrink-0 px-4 pt-3 pb-2 bg-white border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-navy-900">Discover</h2>
              <div className="flex rounded-full overflow-hidden border border-navy-200 shadow-sm bg-white text-sm font-medium">
                <button
                  onClick={() => setMobileView('map')}
                  className="px-4 py-1.5 text-navy-700 transition-colors"
                >
                  Map
                </button>
                <button
                  onClick={() => setMobileView('list')}
                  className="px-4 py-1.5 bg-navy-900 text-white transition-colors"
                >
                  List
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain bg-white"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Search bar + filter icon */}
              <div className="px-4 pt-3 pb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
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
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {/* Filter icon */}
                  <button
                    onClick={() => setFilterOpen((v) => !v)}
                    aria-label="Toggle interest filter"
                    className="relative shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white"
                  >
                    <SlidersHorizontal size={18} className="text-navy-700" />
                    {isFilterActive && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-navy-700" />
                    )}
                  </button>
                </div>
                {mobileSearchResults && (
                  <p className="text-xs text-gray-500">
                    {mobileSearchResults.length} result{mobileSearchResults.length !== 1 && 's'}
                  </p>
                )}
              </div>

              {/* Interest filter (conditionally shown) */}
              {filterOpen && (
                <div className="px-4 pb-3">
                  <InterestFilter
                    activeLevels={activeLevels}
                    onChange={handleFilterChange}
                    availableLevels={availableLevels}
                    totalCount={strippedAllSites.length}
                    filteredCount={visibleSites.length}
                  />
                </div>
              )}

              {mobileSearchResults ? (
                /* Search results */
                <div className="px-4 pb-8">
                  {mobileSearchResults.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      No sites found for &ldquo;{mobileSearchQuery}&rdquo;
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-gray-100">
                      {mobileSearchResults.map((site) => (
                        <SiteListRow key={site.id} site={site} tags={allTags} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 pb-8">
                  {listSites.map((site) => (
                    <SiteListRow key={site.id} site={site} tags={allTags} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile fullscreen map overlay */}
      {mapFullscreen && (
        <div className="md:hidden fixed inset-0 z-50">
          <MapViewDynamic
            pins={visiblePins}
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
