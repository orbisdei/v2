'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Maximize2, SlidersHorizontal, Loader2, List as ListIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AroundMeSidebar from '@/components/AroundMeSidebar';
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
import AroundMeButton, { LocateMeButton } from '@/components/AroundMeButton';
import LocationPermissionSheet from '@/components/LocationPermissionSheet';
import LocationFallbackPanel from '@/components/LocationFallbackPanel';
import TopicFacetRow from '@/components/TopicFacetRow';
import { AroundMeModeBar, RadiusChips, SparseCoverageNotice } from '@/components/AroundMeControls';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import { useMapFloatingCard } from '@/lib/hooks/useMapFloatingCard';
import { useAroundMe } from '@/lib/hooks/useAroundMe';
import { useTopicFacets } from '@/lib/hooks/useTopicFacets';
import { deriveLocationSuggestions } from '@/lib/geo';
import {
  type InterestLevel,
  INTEREST_HIERARCHY,
  PUBLIC_LEVELS,
  filterByInterest,
  normalizeInterest,
  stripPersonalSites,
} from '@/lib/interestFilter';
import { siteToMapPin } from '@/lib/mapPins';
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

  const strippedAllSites = useMemo(() => stripPersonalSites(allSites), [allSites]);

  // ── Around Me ────────────────────────────────────────────────────────────────

  const aroundMe = useAroundMe(strippedAllSites);
  const loc = aroundMe.location;
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  // Around Me opens every interest level; this tracks the user tapping the
  // "All levels" chip to put their own filter back.
  const [levelsRestored, setLevelsRestored] = useState(false);

  const locationSuggestions = useMemo(
    () => deriveLocationSuggestions(strippedAllSites, 6),
    [strippedAllSites],
  );

  const startAroundMe = useCallback(() => {
    aroundMe.enable();
    setManualEntry(false);
    setMapFullscreen(false);
    if (loc.status === 'ready') return;
    // A browser-level block can't be lifted from here, so don't re-prompt — the
    // fallback panel renders instead. And skip the pre-prompt when permission is
    // already granted; there's nothing left to explain.
    if (loc.permission === 'denied') return;
    if (loc.permission === 'granted') { void loc.request(); return; }
    setPermissionSheetOpen(true);
  }, [aroundMe, loc]);

  const exitAroundMe = useCallback(() => {
    aroundMe.disable();
    setManualEntry(false);
    setPermissionSheetOpen(false);
    setLevelsRestored(false);
  }, [aroundMe]);

  const allowLocation = useCallback(() => {
    setPermissionSheetOpen(false);
    void loc.request();
  }, [loc]);

  const openManualEntry = useCallback(() => {
    setPermissionSheetOpen(false);
    setManualEntry(true);
  }, []);

  const pickPlace = useCallback((lat: number, lng: number, label: string) => {
    loc.setManual(lat, lng, label);
    setManualEntry(false);
  }, [loc]);

  // ── Interest filter ──────────────────────────────────────────────────────────

  const availableLevels = PUBLIC_LEVELS;

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
    // Validate against the browsable hierarchy — a stray ?levels=personal is
    // dropped here (personal sites only ever surface inside a user's own lists).
    const parsed = param
      .split(',')
      .filter((l) => (INTEREST_HIERARCHY as string[]).includes(l)) as InterestLevel[];
    if (parsed.length > 0) setActiveLevels(new Set(parsed));
  }, []);

  const handleFilterChange = useCallback(
    (levels: Set<InterestLevel>) => {
      setActiveLevels(levels);
      const sorted = [...levels].sort(
        (a, b) => INTEREST_HIERARCHY.indexOf(a) - INTEREST_HIERARCHY.indexOf(b)
      );
      const params = new URLSearchParams(window.location.search);
      params.set('levels', sorted.join(','));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const interestFilteredSites = useMemo(
    () => filterByInterest(strippedAllSites, activeLevels),
    [strippedAllSites, activeLevels]
  );

  // ── Around Me results: radius is the scope, topics filter inside it ───────────

  const nearbyInRadius = useMemo(() => {
    if (!levelsRestored) return aroundMe.results;
    return aroundMe.results.filter((r) => activeLevels.has(normalizeInterest(r.site.interest)));
  }, [aroundMe.results, levelsRestored, activeLevels]);

  // One facet vocabulary, scoped to whatever the user is actually looking at:
  // the in-radius set in Around Me, the interest-filtered catalog when browsing.
  const facetScope = useMemo(
    () => (aroundMe.active ? nearbyInRadius.map((r) => r.site) : interestFilteredSites),
    [aroundMe.active, nearbyInRadius, interestFilteredSites],
  );
  const topics = useTopicFacets(facetScope, allTags);

  const nearbyFiltered = useMemo(() => {
    if (topics.selected.size === 0) return nearbyInRadius;
    return nearbyInRadius.filter((r) => r.site.tag_ids.some((id) => topics.selected.has(id)));
  }, [nearbyInRadius, topics.selected]);

  const distances = useMemo(
    () => new Map(nearbyFiltered.map((r) => [r.site.id, r.distanceMeters])),
    [nearbyFiltered],
  );
  const numberedSiteIds = useMemo(() => nearbyFiltered.map((r) => r.site.id), [nearbyFiltered]);

  /** Sites shown while browsing (interest filter + any topic facets). */
  const visibleSites = aroundMe.active ? facetScope : topics.filteredSites;

  const visiblePins = useMemo(
    () => (aroundMe.active
      ? nearbyFiltered.map((r) => siteToMapPin(r.site))
      : visibleSites.map(siteToMapPin)),
    [aroundMe.active, nearbyFiltered, visibleSites],
  );

  const userLocationMarker = useMemo(
    () => (loc.lat !== null && loc.lng !== null
      ? { lat: loc.lat, lng: loc.lng, accuracyMeters: loc.accuracyMeters }
      : null),
    [loc.lat, loc.lng, loc.accuracyMeters],
  );

  // Desktop map popup (Leaflet popup portal) + fullscreen mobile floating card
  const popupOpts = useMemo(
    () => ({ distances, distanceUnit: aroundMe.unit }),
    [distances, aroundMe.unit],
  );
  const desktopPopup = useLeafletPopupCard(allSites, allTags, popupOpts);
  const fullscreenCard = useMapFloatingCard(allSites, allTags);
  const aroundMeCard = useMapFloatingCard(allSites, allTags);

  useEffect(() => {
    if (!mapFullscreen) fullscreenCard.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

  const visibleFeaturedSites = useMemo(() => {
    const stripped = stripPersonalSites(featuredSites);
    const byLevel = filterByInterest(stripped, activeLevels);
    if (topics.selected.size === 0) return byLevel;
    return byLevel.filter((s) => s.tag_ids.some((id) => topics.selected.has(id)));
  }, [featuredSites, activeLevels, topics.selected]);

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

  const locating = loc.status === 'locating';
  const aroundMeReady = aroundMe.active && loc.status === 'ready' && !manualEntry;
  const fallbackReason: 'denied' | 'unavailable' | 'manual' | null = manualEntry
    ? 'manual'
    : loc.status === 'denied'
      ? 'denied'
      : loc.status === 'unavailable'
        ? 'unavailable'
        : null;

  /** Shared between the mobile Around Me panel and the fullscreen overlay. */
  const scopeChips = (
    <RadiusChips
      radiusMeters={aroundMe.radiusMeters}
      onChange={aroundMe.setRequestedRadius}
      unit={aroundMe.unit}
      levelsOverridden={!levelsRestored}
      onRestoreLevels={() => setLevelsRestored(true)}
    />
  );

  return (
    <div className="flex flex-1 overflow-hidden relative">

      {/* ── DESKTOP layout (md+): sidebar + map ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {aroundMe.active ? (
          <AroundMeSidebar
            results={nearbyFiltered}
            totalInRadius={nearbyInRadius.length}
            unit={aroundMe.unit}
            status={manualEntry ? 'idle' : loc.status}
            locationLabel={loc.label}
            accuracyMeters={loc.accuracyMeters}
            isManual={loc.isManual}
            errorMessage={loc.error}
            requestedRadius={aroundMe.requestedRadius}
            expanded={aroundMe.expanded}
            facets={topics.facets}
            selectedTopics={topics.selected}
            onToggleTopic={topics.toggle}
            onClearTopics={topics.clear}
            suggestions={locationSuggestions}
            onPickPlace={pickPlace}
            onRetry={allowLocation}
            onBack={exitAroundMe}
            onChangePlace={openManualEntry}
            onSiteHover={handleSiteHover}
          />
        ) : (
          <Sidebar
            sites={visibleSites}
            tags={allTags}
            featuredSites={visibleFeaturedSites}
            onSiteHover={handleSiteHover}
            onAroundMe={startAroundMe}
            aroundMeBusy={locating}
            facets={topics.facets}
            selectedTopics={topics.selected}
            onToggleTopic={topics.toggle}
            onClearTopics={topics.clear}
          />
        )}
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
              userLocation={userLocationMarker}
              radiusMeters={aroundMe.active ? aroundMe.radiusMeters : null}
              numberedSiteIds={aroundMe.active ? numberedSiteIds : undefined}
              followUserLocation={aroundMe.active}
            />
          </LazyMount>
          {/* Scope controls — floating on map, top-left. Around Me replaces the
              interest filter here because the radius ladder and the level
              override describe the same thing this control always described:
              which sites are in play. */}
          <div className="absolute top-3 left-3 z-400 flex flex-col items-start gap-2">
            {aroundMe.active ? (
              <>
                <div className="rounded-lg bg-white p-1 shadow-md">
                  <RadiusChips
                    radiusMeters={aroundMe.radiusMeters}
                    onChange={aroundMe.setRequestedRadius}
                    unit={aroundMe.unit}
                    variant="segmented"
                  />
                </div>
                {!levelsRestored && (
                  <button
                    type="button"
                    onClick={() => setLevelsRestored(true)}
                    className="rounded-full border border-[#f0dda0] bg-[#fef8e0] px-2.5 py-1 text-xs font-medium text-[#8a6d0b] shadow-md hover:bg-[#fdf6d1]"
                  >
                    All interest levels · tap to restore mine
                  </button>
                )}
              </>
            ) : (
              <InterestFilter
                activeLevels={activeLevels}
                onChange={handleFilterChange}
                availableLevels={availableLevels}
                totalCount={strippedAllSites.length}
                filteredCount={visibleSites.length}
              />
            )}
          </div>
          {!aroundMe.active && (
            <div className="absolute top-3 right-3 z-400">
              <LocateMeButton onClick={startAroundMe} busy={locating} />
            </div>
          )}
        </div>
      </div>

      {/* Desktop popup portal */}
      {desktopPopup.portal}

      {/* ── MOBILE layout (<md) ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">

        {aroundMe.active ? (
          /* ── AROUND ME ── */
          <>
            <AroundMeModeBar
              onBack={exitAroundMe}
              label={loc.label}
              accuracyMeters={loc.accuracyMeters}
              isManual={loc.isManual}
              unit={aroundMe.unit}
              onChange={aroundMeReady ? openManualEntry : undefined}
              className="shrink-0"
            />

            {fallbackReason ? (
              <div className="flex-1 overflow-y-auto overscroll-contain bg-white px-3.5">
                <LocationFallbackPanel
                  reason={fallbackReason}
                  message={loc.error}
                  suggestions={locationSuggestions}
                  onPick={pickPlace}
                  onRetry={allowLocation}
                />
              </div>
            ) : !aroundMeReady ? (
              <div className="flex flex-1 items-center justify-center bg-white text-gray-400">
                <Loader2 size={22} className="animate-spin" />
              </div>
            ) : (
              <>
                <div className="h-[22dvh] shrink-0 relative z-1">
                  <MapViewDynamic
                    pins={visiblePins}
                    suppressPopups
                    highlightedSiteId={aroundMeCard.selectedId}
                    onPinClick={aroundMeCard.onPinClick}
                    userLocation={userLocationMarker}
                    radiusMeters={aroundMe.radiusMeters}
                    numberedSiteIds={numberedSiteIds}
                    followUserLocation
                  />
                  <button
                    className="absolute top-3 right-3 z-40 bg-white/90 backdrop-blur-xs rounded-lg p-2 shadow-md"
                    onClick={() => setMapFullscreen(true)}
                    aria-label="Expand map fullscreen"
                  >
                    <Maximize2 size={18} className="text-navy-700" />
                  </button>
                  {aroundMeCard.site && (
                    <div className="absolute bottom-2 left-2.5 right-2.5 z-40">
                      <SiteFloatingCard
                        site={aroundMeCard.site}
                        tags={aroundMeCard.tags}
                        onClose={aroundMeCard.close}
                        distanceMeters={
                          aroundMeCard.selectedId
                            ? distances.get(aroundMeCard.selectedId)
                            : undefined
                        }
                        distanceUnit={aroundMe.unit}
                      />
                    </div>
                  )}
                </div>

                <div
                  className="flex-1 overflow-hidden bg-white flex flex-col"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                  <div className="shrink-0 px-3.5 pt-2.5 pb-1.5 flex flex-col gap-2">
                    {aroundMe.expanded && (
                      <SparseCoverageNotice
                        requestedRadius={aroundMe.requestedRadius}
                        unit={aroundMe.unit}
                      />
                    )}
                    {scopeChips}
                    <TopicFacetRow
                      facets={topics.facets}
                      selected={topics.selected}
                      onToggle={topics.toggle}
                      onClear={topics.clear}
                      resultCount={nearbyFiltered.length}
                      label="Topics near you"
                      inlineLimit={3}
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5">
                    <p className="py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {topics.isActive
                        ? `${nearbyFiltered.length} of ${nearbyInRadius.length} sites`
                        : `${nearbyFiltered.length} site${nearbyFiltered.length !== 1 ? 's' : ''}, nearest first`}
                    </p>
                    {nearbyFiltered.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-500">
                        No sites match these topics near you.
                      </p>
                    ) : (
                      <div className="pb-6">
                        {nearbyFiltered.map(({ site, distanceMeters }) => (
                          <SiteListRow
                            key={site.id}
                            site={site}
                            tags={allTags}
                            distanceMeters={distanceMeters}
                            distanceUnit={aroundMe.unit}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : mobileView === 'map' ? (
          /* ── MAP VIEW ── */
          <>
            {/* Map — fixed height */}
            <div className="h-[38dvh] shrink-0 relative z-1">
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
              {/* Expand + locate buttons */}
              <button
                className="absolute top-3 right-3 z-40 bg-white/90 backdrop-blur-xs rounded-lg p-2 shadow-md"
                onClick={() => setMapFullscreen(true)}
                aria-label="Expand map fullscreen"
              >
                <Maximize2 size={18} className="text-navy-700" />
              </button>
              <div className="absolute top-15 right-3 z-40">
                <LocateMeButton onClick={startAroundMe} busy={locating} className="h-10 w-10" />
              </div>
              {/* Map/List toggle — floating bottom-center (hidden when card is open) */}
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-39 transition-opacity duration-150 ${cardVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <MobileMapListToggle value={mobileView} onChange={setMobileView} />
              </div>

              {/* Floating pin preview card */}
              {cardSiteId && cardSite && (
                <div className={`absolute bottom-2 left-2.5 right-2.5 z-40 transition-all duration-200 ease-out ${
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
                  {/* Search bar + Around Me */}
                  <div className="px-3.5 pt-3 pb-2 flex flex-col gap-2.5">
                    <SearchInput
                      variant="bordered"
                      value={mobileSearchQuery}
                      onChange={setMobileSearchQuery}
                      placeholder="Search by location or topic…"
                      clearable
                    />
                    {mobileSearchResults ? (
                      <p className="text-xs text-gray-500 -mt-1">
                        {mobileSearchResults.length} result{mobileSearchResults.length !== 1 && 's'}
                      </p>
                    ) : (
                      <AroundMeButton onClick={startAroundMe} busy={locating} />
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
                {mobileSearchResults ? (
                  <p className="text-xs text-gray-500">
                    {mobileSearchResults.length} result{mobileSearchResults.length !== 1 && 's'}
                  </p>
                ) : (
                  <AroundMeButton onClick={startAroundMe} busy={locating} />
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

              {/* Topic facets over the whole catalog */}
              {!mobileSearchResults && (
                <div className="px-4 pb-3">
                  <TopicFacetRow
                    facets={topics.facets}
                    selected={topics.selected}
                    onToggle={topics.toggle}
                    onClear={topics.clear}
                    resultCount={visibleSites.length}
                    label="Topics"
                    inlineLimit={3}
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

      {/* Around Me permission pre-prompt */}
      <LocationPermissionSheet
        isOpen={permissionSheetOpen}
        onClose={() => { setPermissionSheetOpen(false); if (loc.status !== 'ready') exitAroundMe(); }}
        onAllow={allowLocation}
        onEnterPlace={openManualEntry}
      />

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
              userLocation={userLocationMarker}
              radiusMeters={aroundMe.active ? aroundMe.radiusMeters : null}
              numberedSiteIds={aroundMe.active ? numberedSiteIds : undefined}
              followUserLocation={aroundMe.active}
            />
          }
          floatingCard={
            fullscreenCard.site && (
              <SiteFloatingCard
                site={fullscreenCard.site}
                tags={fullscreenCard.tags}
                onClose={fullscreenCard.close}
                distanceMeters={
                  fullscreenCard.selectedId ? distances.get(fullscreenCard.selectedId) : undefined
                }
                distanceUnit={aroundMe.unit}
              />
            )
          }
          topRight={
            <LocateMeButton
              onClick={startAroundMe}
              busy={locating}
              active={aroundMe.active}
            />
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
          belowSearch={aroundMe.active ? scopeChips : undefined}
          bottomAction={
            aroundMe.active && !fullscreenCard.site ? (
              <button
                type="button"
                onClick={() => setMapFullscreen(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow-lg"
              >
                <ListIcon size={13} />
                {nearbyFiltered.length} site{nearbyFiltered.length !== 1 && 's'} nearby
              </button>
            ) : undefined
          }
        />
      )}

    </div>
  );
}
