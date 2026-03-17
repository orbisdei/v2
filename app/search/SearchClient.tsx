'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
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
    if (!q) return allTags.filter((t) => t.featured);
    return allTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [query, allTags]);

  return (
    <>
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
              placeholder="Search by location or holy person…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-base rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-gold-400"
              autoFocus
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
              {query ? 'Holy sites' : 'Popular holy sites'}
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
              {query ? 'Holy persons & tags' : 'Popular holy persons'}
            </h2>
            <div className="flex flex-col gap-1">
              {filteredTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group"
                >
                  <div className="w-12 h-12 bg-navy-100 rounded-full shrink-0 flex items-center justify-center">
                    <span className="text-navy-600 text-lg">✙</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
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
              ))}
              {filteredTags.length === 0 && (
                <p className="text-sm text-gray-500 py-4">No tags match your search.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
