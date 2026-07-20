// The four z=1 OSM tiles the mobile split-view map shows at its fixed initial
// view (center [30,10], zoom 1 — see HomePageClient's MapViewDynamic props).
// Shared by two consumers that must stay in lock-step:
//   1. app/page.tsx preloads them (<link rel=preload as=image>) so the bytes
//      are warm before any JS runs.
//   2. HomePageClient paints them as a static <img> 2x2 backdrop, giving the
//      map region an LCP-eligible element at FCP instead of waiting for
//      Leaflet to initialize post-hydration. Leaflet draws its own tiles on
//      top once mounted.
// Subdomain per tile is Leaflet's rotation: abc[(x + y) % 3]. Update these if
// the initial mobile center/zoom ever changes. Desktop starts at zoom 2
// (different tiles), so both consumers keep this phones-only.
export const MOBILE_TILE_PRELOADS = [
  'https://a.tile.openstreetmap.org/1/0/0.png', // (x0,y0) → a
  'https://b.tile.openstreetmap.org/1/1/0.png', // (x1,y0) → b
  'https://b.tile.openstreetmap.org/1/0/1.png', // (x0,y1) → b
  'https://c.tile.openstreetmap.org/1/1/1.png', // (x1,y1) → c
] as const;

// 1x1 transparent GIF. Served to the desktop backdrop via <picture> so the
// mobile-only tiles aren't fetched on desktop (where the map region is never
// shown), mirroring the mobile-gated preloads.
export const TRANSPARENT_PX =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
