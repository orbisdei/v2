'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Search, X, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import type { Site, Tag } from '@/lib/types';
import { getCountryName } from '@/lib/countries';
import { buildTagNameLookup, normalizeQuery, siteMatchesQuery, tagMatchesQuery } from '@/lib/siteSearch';

interface SidebarProps {
  sites: Site[];
  tags: Tag[];
  featuredSites: Site[];
  onSiteHover?: (siteId: string | null) => void;
}

const MAX_TAG_RESULTS = 4;

export default function Sidebar({ sites, tags, featuredSites, onSiteHover }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCountries, setShowAllCountries] = useState(false);

  const featuredTags = useMemo(() => tags.filter((t) => t.featured && (!t.type || t.type === 'topic')), [tags]);

  const tagNameById = useMemo(() => buildTagNameLookup(tags), [tags]);

  // Count sites per country tag
  const countryTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const site of sites) {
      for (const tid of site.tag_ids) {
        const tag = tags.find((t) => t.id === tid && t.type === 'country');
        if (tag) counts.set(tid, (counts.get(tid) ?? 0) + 1);
      }
    }
    return counts;
  }, [sites, tags]);

  const sortedCountryTags = useMemo(() => {
    return tags
      .filter((t) => t.type === 'country')
      .sort((a, b) => (countryTagCounts.get(b.id) ?? 0) - (countryTagCounts.get(a.id) ?? 0));
  }, [tags, countryTagCounts]);

  const searchResults = useMemo(() => {
    const q = normalizeQuery(searchQuery);
    if (!q) return null;
    const matchedTags = tags
      .filter((t) => t.type === 'topic' && tagMatchesQuery(t, q))
      .slice(0, MAX_TAG_RESULTS);
    const matchedSites = sites.filter((s) => siteMatchesQuery(s, q, tagNameById));
    return { tags: matchedTags, sites: matchedSites };
  }, [searchQuery, sites, tags, tagNameById]);

  // Group topics by broad categories (for the "By continent" style display)
  // For now we just show all featured topics as pill buttons

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-r-lg p-2 hover:bg-gray-50 transition-colors"
        aria-label="Open sidebar"
      >
        <ChevronRight size={20} className="text-navy-700" />
      </button>
    );
  }

  return (
    <aside className="w-full md:w-[400px] lg:w-[420px] bg-white border-r border-gray-200 flex flex-col relative shrink-0 z-10">
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(true)}
        className="hidden md:flex absolute -right-3 top-4 z-20 bg-white border border-gray-200 shadow-sm rounded-full w-6 h-6 items-center justify-center hover:bg-gray-50"
        aria-label="Collapse sidebar"
      >
        <ChevronLeft size={14} className="text-gray-500" />
      </button>

      {/* Header area with hero image + tagline */}
      <div className="relative h-36 bg-navy-100 overflow-hidden shrink-0">
        <img src="/images/hero.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/30 to-navy-900/60" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="font-serif text-white text-lg font-bold leading-snug drop-shadow-lg">
            Discover sacred sites worldwide
          </h2>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by location or topic…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {searchResults ? (
          /* Search results */
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-navy-700 hover:text-navy-500 font-medium flex items-center gap-1"
              >
                ← Back
              </button>
              <span className="text-xs text-gray-500">{searchResults.tags.length + searchResults.sites.length} Results</span>
            </div>

            {/* Topic tag matches */}
            {searchResults.tags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Topics</h4>
                <div className="flex flex-col gap-1">
                  {searchResults.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tag/${tag.id}`}
                      className="flex items-center gap-3 px-2 py-2.5 min-h-[44px] rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <span className="w-5 shrink-0 flex justify-center">
                        <TagIcon size={14} className="text-gray-400" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                          {tag.name}
                        </h4>
                        {tag.description && (
                          <p className="text-xs text-gray-500 truncate">{tag.description}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Site matches */}
            {searchResults.sites.length > 0 && (
              <div>
                {searchResults.tags.length > 0 && (
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sites</h4>
                )}
                <div className="flex flex-col gap-1">
                  {searchResults.sites.map((site, idx) => {
                    const countryName = site.country ? getCountryName(site.country) : '';
                    const locationParts = [site.municipality, countryName].filter(Boolean);
                    return (
                      <Link
                        key={site.id}
                        href={`/site/${site.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200"
                        onMouseEnter={() => onSiteHover?.(site.id)}
                        onMouseLeave={() => onSiteHover?.(null)}
                      >
                        <span className="text-sm font-medium text-gray-400 w-5 shrink-0 text-center">{idx + 1}</span>
                        {site.images[0] ? (
                          <img
                            src={site.images[0].url}
                            alt={site.name}
                            className="w-14 h-14 object-cover rounded-md shrink-0"
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-navy-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                            {site.name}
                          </h4>
                          {locationParts.length > 0 && (
                            <p className="text-[11px] text-gray-500 truncate mt-0">{locationParts.join(', ')}</p>
                          )}
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                            {site.short_description}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {searchResults.tags.length === 0 && searchResults.sites.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        ) : (
          /* Default: Tags + Featured sites */
          <div className="p-3">
            {/* Tag pills */}
            <section className="mb-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Featured topics
              </h3>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pr-3">
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
            </section>

            {/* Browse by location */}
            {sortedCountryTags.length > 0 && (
              <section className="mb-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Browse by location
                </h3>
                <div className="flex gap-2 pb-1 pr-3 flex-wrap">
                  {(showAllCountries ? sortedCountryTags : sortedCountryTags.slice(0, 8)).map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tag/${tag.id}`}
                      className="inline-flex items-center shrink-0 min-h-[36px] px-3 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      {tag.name}
                    </Link>
                  ))}
                  {sortedCountryTags.length > 8 && (
                    <button
                      onClick={() => setShowAllCountries((v) => !v)}
                      className="inline-flex items-center shrink-0 min-h-[36px] px-3 text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap"
                    >
                      {showAllCountries ? 'Show fewer' : `Show all ${sortedCountryTags.length}`}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Featured holy sites */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Featured holy sites
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {featuredSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/site/${site.id}`}
                    className="group rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
                    onMouseEnter={() => onSiteHover?.(site.id)}
                    onMouseLeave={() => onSiteHover?.(null)}
                  >
                    {site.images[0] && (
                      <div className="h-24 md:h-auto md:aspect-[4/3] overflow-hidden relative">
                        <Image
                          src={site.images[0].url}
                          alt={site.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, 200px"
                        />
                      </div>
                    )}
                    <div className="p-2">
                      <h4 className="text-xs font-semibold text-navy-900 leading-tight line-clamp-2 group-hover:text-navy-600">
                        {site.name}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}
