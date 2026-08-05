'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SiteListRow from '@/components/SiteListRow';
import TagListRow from '@/components/TagListRow';
import InterestFilter from '@/components/InterestFilter';
import SearchInput from '@/components/SearchInput';
import TopicFacetRow from '@/components/TopicFacetRow';
import NearestFirstButton from '@/components/NearestFirstButton';
import {
  type InterestLevel,
  INTEREST_HIERARCHY,
  PUBLIC_LEVELS,
  filterByInterest,
  stripPersonalSites,
} from '@/lib/interestFilter';
import type { Site, Tag } from '@/lib/types';
import { buildTagNameLookup, normalizeQuery, siteMatchesQuery, tagMatchesQuery } from '@/lib/siteSearch';
import { useTopicFacets } from '@/lib/hooks/useTopicFacets';
import { useUserLocation, useDistanceUnit } from '@/lib/hooks/useUserLocation';
import { deriveLocationSuggestions, sortByDistance } from '@/lib/geo';

interface SearchClientProps {
  allSites: Site[];
  allTags: Tag[];
}

export default function SearchClient({ allSites, allTags }: SearchClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [nearestFirst, setNearestFirst] = useState(false);

  // ── Interest filter ──────────────────────────────────────────────────────────

  const availableLevels = PUBLIC_LEVELS;

  // Init to the deterministic default (all public levels). The ?levels= param
  // is applied after mount via the effect below — reading it with
  // useSearchParams() here would force this whole subtree to client-side
  // rendering, keeping the results out of the static HTML and tanking LCP.
  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(
    () => new Set(PUBLIC_LEVELS)
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

  const defaultLevels = useMemo(() => new Set<InterestLevel>(PUBLIC_LEVELS), []);

  const filtersActive = useMemo(
    () =>
      activeLevels.size !== defaultLevels.size ||
      [...activeLevels].some((l) => !defaultLevels.has(l)),
    [activeLevels, defaultLevels]
  );

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

  const strippedAllSites = useMemo(() => stripPersonalSites(allSites), [allSites]);

  const tagNameById = useMemo(() => buildTagNameLookup(allTags), [allTags]);

  // Text search runs against strippedAllSites (broadly), then filtered by activeLevels for display
  const searchedSites = useMemo(() => {
    const q = normalizeQuery(query);
    const searched = q
      ? strippedAllSites.filter((s) => siteMatchesQuery(s, q, tagNameById))
      : strippedAllSites.filter((s) => s.featured);
    return filterByInterest(searched, activeLevels);
  }, [query, strippedAllSites, activeLevels, tagNameById]);

  // ── Topic facets + distance sort over whatever the query returned ────────────
  //
  // "Shrine" returns dozens of results with no way to prioritise; topic and
  // distance are both better axes than text relevance here. Both narrow the same
  // set, so `filteredSites` stays the name of the finally-displayed list and every
  // render site below is unchanged.
  const topics = useTopicFacets(searchedSites, allTags);

  const loc = useUserLocation();
  const distanceUnit = useDistanceUnit();
  const locationSuggestions = useMemo(
    () => deriveLocationSuggestions(strippedAllSites, 6),
    [strippedAllSites]
  );

  const distances = useMemo(() => {
    if (loc.lat === null || loc.lng === null) return new Map<string, number>();
    return new Map(
      sortByDistance(topics.filteredSites, loc.lat, loc.lng).map(
        (r) => [r.site.id, r.distanceMeters] as const
      )
    );
  }, [topics.filteredSites, loc.lat, loc.lng]);

  const filteredSites = useMemo(() => {
    if (!nearestFirst || loc.lat === null || loc.lng === null) return topics.filteredSites;
    return sortByDistance(topics.filteredSites, loc.lat, loc.lng).map((r) => r.site);
  }, [nearestFirst, topics.filteredSites, loc.lat, loc.lng]);

  const distanceFor = (id: string) => (nearestFirst ? distances.get(id) : undefined);

  /** Facets + sort, shared by the mobile and desktop layouts. */
  const resultControls = (
    <div className="flex flex-col gap-2">
      <TopicFacetRow
        facets={topics.facets}
        selected={topics.selected}
        onToggle={topics.toggle}
        onClear={topics.clear}
        resultCount={topics.filteredSites.length}
        label="Narrow by topic"
        inlineLimit={4}
      />
      <div className="flex items-center gap-2">
        <NearestFirstButton
          active={nearestFirst}
          onChange={setNearestFirst}
          suggestions={locationSuggestions}
        />
        {topics.isActive && (
          <span className="text-[11px] text-gray-500">
            {filteredSites.length} of {searchedSites.length} sites
          </span>
        )}
      </div>
    </div>
  );

  const filteredTags = useMemo(() => {
    const q = normalizeQuery(query);
    const base = q
      ? allTags.filter((t) => tagMatchesQuery(t, q))
      : allTags.filter((t) => t.featured && (!t.type || t.type === 'topic'));
    return [
      ...base.filter((t) => !t.type || t.type === 'topic'),
      ...base.filter((t) => t.type && t.type !== 'topic'),
    ];
  }, [query, allTags]);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      {/* ── MOBILE layout (below md) ── single scrollable column */}
      <div className="md:hidden">

        {/* Search hero + filter icon */}
        <div className="bg-navy-900 px-4 pt-4 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                variant="hero"
                value={query}
                onChange={setQuery}
                placeholder="Search by location or topic…"
                autoFocus
              />
            </div>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white relative"
              aria-label="Filter"
            >
              <SlidersHorizontal size={18} className="text-navy-700" />
              {filtersActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-navy-600" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible interest filter */}
        {filterOpen && (
          <div className="px-3 py-2 bg-white border-b border-gray-100">
            <InterestFilter
              activeLevels={activeLevels}
              onChange={handleFilterChange}
              availableLevels={availableLevels}
              totalCount={strippedAllSites.length}
              filteredCount={filteredSites.length}
            />
          </div>
        )}

        {/* Topic facets + distance sort */}
        <div className="px-3.5 pt-3 pb-1 border-b border-gray-100">{resultControls}</div>

        {/* Results */}
        <div className="pb-4">
          {hasQuery ? (
            <>
              {filteredSites.length > 0 && filteredTags.length > 0 ? (
                /* Both have results — show with subtle section labels */
                <>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">
                    Holy sites
                  </p>
                  <div className="px-3">
                    {filteredSites.map((site, idx) => (
                      <SiteListRow
                        key={site.id}
                        site={site}
                        tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                        priority={idx === 0}
                        distanceMeters={distanceFor(site.id)}
                        distanceUnit={distanceUnit}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">
                    Topics
                  </p>
                  <div className="px-3">
                    {filteredTags.map((tag) => (
                      <TagListRow key={tag.id} tag={tag} />
                    ))}
                  </div>
                </>
              ) : (
                /* Only one type has results (or none) */
                <div className="px-3">
                  {filteredSites.map((site, idx) => (
                    <SiteListRow
                      key={site.id}
                      site={site}
                      tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                      priority={idx === 0}
                      distanceMeters={distanceFor(site.id)}
                      distanceUnit={distanceUnit}
                    />
                  ))}
                  {filteredTags.map((tag) => (
                    <TagListRow key={tag.id} tag={tag} />
                  ))}
                  {filteredSites.length === 0 && filteredTags.length === 0 && (
                    <p className="text-[13px] text-gray-500 py-4">No results match your search.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Default state: featured sites and topics */
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">
                Featured sites
              </p>
              <div className="px-3">
                {filteredSites.map((site, idx) => (
                  <SiteListRow
                    key={site.id}
                    site={site}
                    tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                    priority={idx === 0}
                    distanceMeters={distanceFor(site.id)}
                    distanceUnit={distanceUnit}
                  />
                ))}
                {filteredSites.length === 0 && (
                  <p className="text-[13px] text-gray-500 py-4">No featured sites.</p>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">
                Featured topics
              </p>
              <div className="px-3">
                {filteredTags.map((tag) => (
                  <TagListRow key={tag.id} tag={tag} />
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-[13px] text-gray-500 py-4">No featured topics.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* ── DESKTOP layout (md+) — two-column grid ── */}
      <div className="hidden md:block">
        {/* Hero/search area */}
        <div className="bg-navy-900 px-4 py-10">
          <div className="max-w-2xl mx-auto">
            <SearchInput
              variant="hero"
              value={query}
              onChange={setQuery}
              placeholder="Search by location or topic…"
              autoFocus
            />
          </div>
        </div>

        {/* Interest filter — below search bar, above results */}
        <div className="max-w-5xl mx-auto px-4 pt-4 flex flex-col gap-3">
          <InterestFilter
            activeLevels={activeLevels}
            onChange={handleFilterChange}
            availableLevels={availableLevels}
            totalCount={strippedAllSites.length}
            filteredCount={filteredSites.length}
          />
          {resultControls}
        </div>

        {/* Results */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sites column */}
            <div>
              <h2 className="font-serif text-lg font-bold text-navy-900 mb-3">
                {hasQuery ? 'Holy sites' : 'Featured sites'}
              </h2>
              <div>
                {filteredSites.map((site, idx) => (
                  <SiteListRow
                    key={site.id}
                    site={site}
                    tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                    priority={idx === 0}
                    distanceMeters={distanceFor(site.id)}
                    distanceUnit={distanceUnit}
                  />
                ))}
                {filteredSites.length === 0 && (
                  <p className="text-sm text-gray-500 py-4">No sites match your search.</p>
                )}
              </div>
            </div>

            {/* Tags column */}
            <div>
              <h2 className="font-serif text-lg font-bold text-navy-900 mb-3">
                {hasQuery ? 'Topics' : 'Featured topics'}
              </h2>
              <div>
                {filteredTags.map((tag) => (
                  <TagListRow key={tag.id} tag={tag} />
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-sm text-gray-500 py-4">No topics match your search.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
