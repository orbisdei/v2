'use client';

import { useState, useMemo, useCallback } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import SiteListRow from '@/components/SiteListRow';
import TagListRow from '@/components/TagListRow';
import InterestFilter from '@/components/InterestFilter';
import SearchInput from '@/components/SearchInput';
import {
  type InterestLevel,
  filterByInterest,
  stripPersonalSites,
  getAvailableLevels,
} from '@/lib/interestFilter';
import type { Site, Tag } from '@/lib/types';
import { buildTagNameLookup, normalizeQuery, siteMatchesQuery, tagMatchesQuery } from '@/lib/siteSearch';

interface SearchClientProps {
  allSites: Site[];
  allTags: Tag[];
  userRole?: string | null;
}

export default function SearchClient({ allSites, allTags, userRole }: SearchClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // ── Interest filter ──────────────────────────────────────────────────────────

  const availableLevels = useMemo(() => getAvailableLevels(userRole), [userRole]);

  const [activeLevels, setActiveLevels] = useState<Set<InterestLevel>>(() => {
    const param = searchParams.get('levels');
    if (param) {
      const parsed = param
        .split(',')
        .filter((l) => availableLevels.includes(l as InterestLevel)) as InterestLevel[];
      if (parsed.length > 0) return new Set(parsed);
    }
    // Default: all public levels
    return new Set(['global', 'regional', 'local'] as InterestLevel[]);
  });

  const defaultLevels = useMemo(
    () => new Set<InterestLevel>(['global', 'regional', 'local']),
    []
  );

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

  const tagNameById = useMemo(() => buildTagNameLookup(allTags), [allTags]);

  // Text search runs against strippedAllSites (broadly), then filtered by activeLevels for display
  const filteredSites = useMemo(() => {
    const q = normalizeQuery(query);
    const searched = q
      ? strippedAllSites.filter((s) => siteMatchesQuery(s, q, tagNameById))
      : strippedAllSites.filter((s) => s.featured);
    return filterByInterest(searched, activeLevels);
  }, [query, strippedAllSites, activeLevels, tagNameById]);

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

        {/* Results */}
        <div className="pb-4">
          {hasQuery ? (
            <>
              {filteredSites.length > 0 && filteredTags.length > 0 ? (
                /* Both have results — show with subtle section labels */
                <>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3.5 pt-3 pb-1">
                    Holy sites
                  </p>
                  <div className="px-3">
                    {filteredSites.map((site) => (
                      <SiteListRow
                        key={site.id}
                        site={site}
                        tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3.5 pt-3 pb-1">
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
                  {filteredSites.map((site) => (
                    <SiteListRow
                      key={site.id}
                      site={site}
                      tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
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
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3.5 pt-3 pb-1">
                Featured sites
              </p>
              <div className="px-3">
                {filteredSites.map((site) => (
                  <SiteListRow
                    key={site.id}
                    site={site}
                    tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
                  />
                ))}
                {filteredSites.length === 0 && (
                  <p className="text-[13px] text-gray-500 py-4">No featured sites.</p>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3.5 pt-3 pb-1">
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
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <InterestFilter
            activeLevels={activeLevels}
            onChange={handleFilterChange}
            availableLevels={availableLevels}
            totalCount={strippedAllSites.length}
            filteredCount={filteredSites.length}
          />
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
                {filteredSites.map((site) => (
                  <SiteListRow
                    key={site.id}
                    site={site}
                    tags={allTags.filter((t) => site.tag_ids.includes(t.id))}
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
