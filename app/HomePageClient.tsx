'use client';

import { useState, useCallback } from 'react';
import { List, Map } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MapViewDynamic from '@/components/MapViewDynamic';
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
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const handleSiteHover = useCallback((id: string | null) => {
    setHoveredSiteId(id);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          sites={allSites}
          tags={allTags}
          featuredSites={featuredSites}
          onSiteHover={handleSiteHover}
        />
      </div>

      {/* Map — fills remaining space on desktop, full screen on mobile */}
      <div className="flex-1 relative">
        <MapViewDynamic
          pins={mapPins}
          highlightedSiteId={hoveredSiteId}
        />
      </div>

      {/* Mobile: FAB toggle button (bottom-left, above map attribution) */}
      <button
        className="md:hidden fixed bottom-8 left-4 z-30 inline-flex items-center gap-2 bg-navy-900 text-white pl-4 pr-5 rounded-full shadow-lg min-h-[44px] text-sm font-medium"
        onClick={() => setMobileListOpen(true)}
        aria-label="Show list view"
      >
        <List size={18} />
        List
      </button>

      {/* Mobile: full-screen list overlay */}
      {mobileListOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 flex flex-col">
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 border-b border-gray-100 shrink-0 h-14">
            <h2 className="font-serif text-lg font-bold text-navy-900">Explore</h2>
            <button
              onClick={() => setMobileListOpen(false)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 min-h-[44px] px-2 -mr-2"
              aria-label="Back to map"
            >
              <Map size={16} />
              Map
            </button>
          </div>

          {/* Scrollable sidebar content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <Sidebar
              sites={allSites}
              tags={allTags}
              featuredSites={featuredSites}
            />
          </div>
        </div>
      )}
    </div>
  );
}
