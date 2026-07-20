'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Maximize2, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import MapViewDynamic from '@/components/MapViewDynamic';
import LazyMount from '@/components/LazyMount';
import SiteFloatingCard from '@/components/SiteFloatingCard';
import InterestFilter from '@/components/InterestFilter';
import SiteGridCard from '@/components/SiteGridCard';
import SiteListRow from '@/components/SiteListRow';
import MobileMapListToggle from '@/components/MobileMapListToggle';
import FeaturedTopicPills from '@/components/FeaturedTopicPills';
import FullscreenMapOverlay from '@/components/FullscreenMapOverlay';
import SearchInput from '@/components/SearchInput';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import { useMapFloatingCard } from '@/lib/hooks/useMapFloatingCard';
import {
  type InterestLevel,
  INTEREST_HIERARCHY,
  filterByInterest,
  stripPersonalSites,
  getAvailableLevels,
} from '@/lib/interestFilter';
import { siteToMapPin } from '@/lib/mapPins';
import { useProfileContext } from '@/context/ProfileContext';
import type { Site, Tag } from '@/lib/types';
import { buildTagNameLookup, normalizeQuery, siteMatchesQuery } from '@/lib/siteSearch';
import { MOBILE_TILE_PRELOADS, TRANSPARENT_PX } from './homeMapTiles';

interface HomePageClientProps {
  allSites: Site[];
  allTags: Tag[];
  appSettings: Record<string, unknown>;
}

export default function HomePageClient({
  allSites,
  allTags,
  appSettings,
}: HomePageClientProps) {
  const router = useRouter();

  // Role resolves client-side (ProfileContext) so the page itself can be
  // statically rendered. Until the profile loads, the user is treated as
  // anonymous — admin-only 'personal' sites appear once the profile arrives.
  const { profile } = useProfileContext();
  const userRole = profile?.role ?? null;

  // Derived once from the catalog instead of shipped as separate props.
  const featuredSites = useMemo(() => allSites.filter((s) => s.featured), [allSites]);

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

  // Desktop map popup (Leaflet popup portal) + fullscreen mobile floating card
  const desktopPopup = useLeafletPopupCard(allSites, allTags);
  const fullscreenCard = useMapFloatingCard(allSites, allTags);

  useEffect(() => {
    if (!mapFullscreen) fullscreenCard.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

  // ── Interest filter ──────────────────────────────────────────────────────────

  const availableLevels = useMemo(() => getAvailableLevels(userRole), [userRole]);

  const defaultLevels = useMemo((): InterestLevel[] => {
    const fromSettings = appSettings?.homepage_default_levels;
    if (Array.isArray(fromSettings)) return fromSettings as InterestLevel[];
    return ['global', 'regional'];
  }, [appSettings]);

  // Init from defaults (server-safe + deterministic). The ?levels= param is
  // applied after mount via the effect below — reading it with
  // useSearchParams() here would force this whole subtree to client-side
  // rendering, keeping the map's static tile backdrop and featured content out
  // of the prerendered HTML and delaying LCP until hydration.
  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(
    () => new Set(defaultLevels)
  );

  // Apply a shared ?levels= filter from the URL once, on the client, after the
  // server-rendered default has already painted.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('levels');
    if (!param) return;
    // Validate against the full hierarchy (not availableLevels): the role loads
    // async, so an admin's ?levels=personal must survive. For non-admins a
    // stray 'personal' is harmless — those sites are stripped.
    const parsed = param
      .split(',')
      .filter((l) => (INTEREST_HIERARCHY as string[]).includes(l)) as InterestLevel[];
    if (parsed.length > 0) setActiveLevels(new Set(parsed));
  }, []);

  const handleFilterChange = useCallback(
    (levels: Set<InterestLevel>) => {
      setActiveLevels(levels);
      const sorted = [...levels].sort(
        (a, b) =>
          (['global', 'regional', 'local', 'personal'] as InterestLevel[]).indexOf(a) -
          (['global', 'regional', 'local', 'personal'] as InterestLevel[]).indexOf(b)
      );
      const params = new URLSearchParams(window.location.search);
      params.set('levels', sorted.join(','));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const strippedAllSites = useMemo(
    () => stripPersonalSites(allSites, userRole),
    [allSites, userRole]
  );

  const visibleSites = useMemo(
    () => filterByInterest(strippedAllSites, activeLevels),
    [strippedAllSites, activeLevels]
  );

  const visiblePins = useMemo(() => visibleSites.map(siteToMapPin), [visibleSites]);

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

  const tagNameById = useMemo(() => buildTagNameLookup(allTags), [allTags]);

  // Search against all stripped sites (not filtered), so interest filter doesn't restrict search
  const mapSearchResults = useMemo(() => {
    const q = normalizeQuery(mapSearchQuery);
    if (!q) return null;
    return strippedAllSites
      .filter((s) => siteMatchesQuery(s, q, tagNameById))
      .slice(0, 6);
  }, [mapSearchQuery, strippedAllSites, tagNameById]);

  const mobileSearchResults = useMemo(() => {
    const q = normalizeQuery(mobileSearchQuery);
    if (!q) return null;
    return strippedAllSites.filter((s) => siteMatchesQuery(s, q, tagNameById));
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
          {/* LazyMount: this desktop map is display:none below md, so phones
              no longer initialize Leaflet twice. On desktop it's in the first
              viewport and mounts immediately. */}
          <LazyMount>
            <MapViewDynamic
              pins={visiblePins}
              initialZoom={2}
              highlightedSiteId={desktopPopup.highlightedPinId ?? hoveredSiteId}
              onPopupOpen={desktopPopup.onPopupOpen}
              onPopupClose={desktopPopup.onPopupClose}
            />
          </LazyMount>
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
              {/* Static tile backdrop. One full-bleed <img> whose bytes are
                  preloaded in the document <head> (MOBILE_TILE_PRELOADS in
                  app/page.tsx), so it paints at ~FCP and becomes the map
                  region's largest-contentful element.

                  It MUST be a single element covering the whole box, not a 2x2
                  grid: PSI confirmed the homepage LCP was a 256px Leaflet tile,
                  and a grid split the backdrop into cells each SMALLER than that
                  tile — so the tile stayed the largest element and won LCP,
                  painting late on Leaflet's JS render delay (~728ms+). A single
                  full-box tile out-sizes any Leaflet tile, so LCP lands at FCP.
                  Leaflet mounts on top (z-10) and covers it. */}
              <picture aria-hidden className="absolute inset-0 block pointer-events-none">
                {/* Desktop never shows this map region — swap to a 1x1 pixel so
                    only phones fetch the tile (matches the mobile-gated preloads). */}
                <source media="(min-width: 768px)" srcSet={TRANSPARENT_PX} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MOBILE_TILE_PRELOADS[1]} alt="" className="w-full h-full object-cover" />
              </picture>
              <LazyMount className="relative z-10 w-full h-full">
                <MapViewDynamic
                  pins={visiblePins}
                  initialZoom={1}
                  minZoom={1}
                  suppressPopups
                  highlightedSiteId={selectedSiteId}
                  onPinClick={handleMobilePinClick}
                />
              </LazyMount>
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
                <MobileMapListToggle value={mobileView} onChange={setMobileView} />
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
                    <SearchInput
                      variant="bordered"
                      value={mobileSearchQuery}
                      onChange={setMobileSearchQuery}
                      placeholder="Search by location or topic…"
                      clearable
                    />
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
                      <FeaturedTopicPills tags={featuredTags} className="mb-2" />
                      <div className="px-3.5 pb-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Featured sites
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {gridSites.map((site, idx) => (
                            <SiteGridCard key={site.id} site={site} priority={idx < 4} />
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
              <MobileMapListToggle value={mobileView} onChange={setMobileView} />
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain bg-white"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Search bar + filter icon */}
              <div className="px-4 pt-3 pb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchInput
                      variant="bordered"
                      value={mobileSearchQuery}
                      onChange={setMobileSearchQuery}
                      placeholder="Search by location or topic…"
                      clearable
                    />
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
        <FullscreenMapOverlay
          onClose={() => { setMapFullscreen(false); setMapSearchQuery(''); }}
          map={
            <MapViewDynamic
              pins={visiblePins}
              suppressPopups
              highlightedSiteId={fullscreenCard.selectedId}
              onPinClick={fullscreenCard.onPinClick}
            />
          }
          floatingCard={
            fullscreenCard.site && (
              <SiteFloatingCard
                site={fullscreenCard.site}
                tags={fullscreenCard.tags}
                onClose={fullscreenCard.close}
              />
            )
          }
          search={
            <div className="relative">
              <SearchInput
                variant="shadow"
                value={mapSearchQuery}
                onChange={setMapSearchQuery}
                placeholder="Search sites…"
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
          }
        />
      )}

    </div>
  );
}
