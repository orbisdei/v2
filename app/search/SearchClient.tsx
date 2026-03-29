'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import SiteRowActions from '@/components/SiteRowActions';
import type { Site, Tag } from '@/lib/types';

interface SearchClientProps {
  allSites: Site[];
  allTags: Tag[];
}

export default function SearchClient({ allSites, allTags }: SearchClientProps) {
  const [query, setQuery] = useState('');

  const filteredSites = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allSites.filter((s) => s.featured);
    return allSites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short_description.toLowerCase().includes(q)
    );
  }, [query, allSites]);

  const filteredTags = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = q
      ? allTags.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        )
      : allTags.filter((t) => t.featured && (!t.type || t.type === 'topic'));
    return [
      ...base.filter((t) => !t.type || t.type === 'topic'),
      ...base.filter((t) => t.type && t.type !== 'topic'),
    ];
  }, [query, allTags]);

  return (
    <>
      {/* ── MOBILE layout (below md) ── single scrollable column */}
      <div className="md:hidden">

        {/* 2. Search hero */}
        <div className="bg-navy-900 px-4 pt-4 pb-5">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by location or topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-[10px] text-[12px] rounded-[10px] border-0 focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white"
            />
          </div>
        </div>

        {/* 3. Featured sites section */}
        <div>
          <h2 className="font-serif text-[15px] font-medium text-navy-900 px-[14px] pt-[14px] pb-2">
            {query ? 'Holy sites' : 'Featured sites'}
          </h2>
          <div className="px-3">
            {filteredSites.map((site) => (
              <Link
                key={site.id}
                href={`/site/${site.id}`}
                className="flex items-center gap-3 py-[8px] min-h-[44px] border-b border-gray-100 last:border-0"
              >
                {site.images[0] ? (
                  <img
                    src={site.images[0].url}
                    alt={site.name}
                    className="w-11 h-11 rounded-[6px] object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-[6px] bg-navy-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-medium text-navy-900 truncate leading-snug">
                    {site.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
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
                <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                <ChevronRight size={15} className="text-gray-300 shrink-0" />
              </Link>
            ))}
            {filteredSites.length === 0 && (
              <p className="text-[13px] text-gray-500 py-4">No sites match your search.</p>
            )}
          </div>
        </div>

        {/* 4. Featured topics section */}
        <div className="pt-[14px] pb-4">
          <h2 className="font-serif text-[15px] font-medium text-navy-900 px-[14px] pb-2">
            {query ? 'Topics' : 'Featured topics'}
          </h2>
          <div className="px-3">
            {filteredTags.map((tag) => {
              const isLocation = tag.type && tag.type !== 'topic';
              return (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.id}`}
                  className="flex items-center gap-3 py-[8px] min-h-[44px] border-b border-gray-100 last:border-0"
                >
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${isLocation ? 'bg-blue-50' : 'bg-navy-100'}`}>
                    <span className={`text-sm ${isLocation ? 'text-blue-600' : 'text-navy-600'}`}>{isLocation ? '📍' : '✙'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[12px] font-medium truncate leading-snug ${isLocation ? 'text-blue-900' : 'text-navy-900'}`}>
                      {tag.name}
                    </h4>
                    {tag.featured && (
                      <span
                        className="inline-block mt-1 rounded text-[9px] font-medium"
                        style={{ background: '#fef8e0', color: '#8a6d0b', padding: '2px 7px' }}
                      >
                        featured
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-gray-300 shrink-0" />
                </Link>
              );
            })}
            {filteredTags.length === 0 && (
              <p className="text-[13px] text-gray-500 py-4">No topics match your search.</p>
            )}
          </div>
        </div>

        {/* 5. Bottom padding */}
        <div className="h-4" />
      </div>

      {/* ── DESKTOP layout (md+) — two-column grid ── */}
      <div className="hidden md:block">
        {/* Hero/search area */}
        <div className="bg-navy-900 px-4 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by location or topic…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full pl-11 pr-4 py-3 text-base rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Sites column */}
            <div>
              <h2 className="font-serif text-lg font-bold text-navy-900 mb-3">
                {query ? 'Holy sites' : 'Featured sites'}
              </h2>
              <div className="flex flex-col gap-1">
                {filteredSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/site/${site.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
                  >
                    {site.images[0] && (
                      <img
                        src={site.images[0].url}
                        alt={site.name}
                        className="w-12 h-12 object-cover rounded-md shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                        {site.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {site.short_description}
                      </p>
                      {site.featured && (
                        <span className="text-[10px] text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                          featured
                        </span>
                      )}
                    </div>
                    <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </Link>
                ))}
                {filteredSites.length === 0 && (
                  <p className="text-sm text-gray-500 py-4">No sites match your search.</p>
                )}
              </div>
            </div>

            {/* Tags column */}
            <div>
              <h2 className="font-serif text-lg font-bold text-navy-900 mb-3">
                {query ? 'Topics' : 'Featured topics'}
              </h2>
              <div className="flex flex-col gap-1">
                {filteredTags.map((tag) => {
                  const isLocation = tag.type && tag.type !== 'topic';
                  return (
                    <Link
                      key={tag.id}
                      href={`/tag/${tag.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${isLocation ? 'bg-blue-50' : 'bg-navy-100'}`}>
                        <span className={`text-lg ${isLocation ? 'text-blue-600' : 'text-navy-600'}`}>{isLocation ? '📍' : '✙'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold truncate ${isLocation ? 'text-blue-900 group-hover:text-blue-700' : 'text-navy-900 group-hover:text-navy-600'}`}>
                          {tag.name}
                        </h4>
                        {tag.featured && (
                          <span className="text-[10px] text-gold-700 bg-gold-50 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                            featured
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </Link>
                  );
                })}
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
