'use client';

import dynamic from 'next/dynamic';

// Leaflet requires `window` and `document`, which don't exist during
// server-side rendering. Dynamic import with ssr:false solves this.
//
// The loading fallback is transparent (no opaque fill) so anything painted
// behind the map shows through while the Leaflet chunk loads — notably the
// homepage's static tile backdrop, which is the LCP element and must stay
// visible through the handoff instead of being covered by a navy block.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-navy-400 text-sm animate-pulse drop-shadow-sm">Loading map…</div>
    </div>
  ),
});

export default MapView;
