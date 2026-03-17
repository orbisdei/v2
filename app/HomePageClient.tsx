'use client';

import { useState, useCallback } from 'react';
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

  const handleSiteHover = useCallback((id: string | null) => {
    setHoveredSiteId(id);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          sites={allSites}
          tags={allTags}
          featuredSites={featuredSites}
          onSiteHover={handleSiteHover}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapViewDynamic
          pins={mapPins}
          highlightedSiteId={hoveredSiteId}
        />
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <MobileBottomBar allSites={allSites} allTags={allTags} featuredSites={featuredSites} />
      </div>
    </div>
  );
}

function MobileBottomBar({
  allSites,
  allTags,
  featuredSites,
}: {
  allSites: Site[];
  allTags: Tag[];
  featuredSites: Site[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 text-left px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
        >
          Search by location or holy person…
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-serif text-lg font-bold text-navy-900">Explore</h2>
            <button onClick={() => setOpen(false)} className="text-gray-500 text-sm font-medium">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              sites={allSites}
              tags={allTags}
              featuredSites={featuredSites}
            />
          </div>
        </div>
      )}
    </>
  );
}
