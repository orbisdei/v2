'use client';

import dynamic from 'next/dynamic';

// Leaflet requires `window` and `document`, which don't exist during
// server-side rendering. Dynamic import with ssr:false solves this.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-navy-50 flex items-center justify-center">
      <div className="text-navy-400 text-sm animate-pulse">Loading map…</div>
    </div>
  ),
});

export default MapView;
