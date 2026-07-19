import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import HomePageClient from './HomePageClient';
import { getAllSitesSummary, getAllTags, getAppSettings } from '@/lib/data';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

// Statically rendered + ISR. All data reads use the cookie-free static client;
// user-specific bits (role-gated filter levels) resolve client-side via
// ProfileContext. Mutation routes bust this via revalidateTag(SITES_TAG/TAGS_TAG),
// so the timer is only a fallback — hourly revalidation burns ISR write units.
export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'Orbis Dei — Discover Sacred Sites Worldwide',
  description:
    'Explore Catholic churches, shrines, basilicas, and pilgrimage sites on an interactive map. Discover sacred places worldwide with Orbis Dei.',
  alternates: { canonical: base },
  openGraph: {
    title: 'Orbis Dei — Discover Sacred Sites Worldwide',
    description:
      'Explore Catholic churches, shrines, basilicas, and pilgrimage sites on an interactive map.',
    url: base,
    type: 'website',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Orbis Dei — Discover Sacred Sites Worldwide' }],
  },
  twitter: {
    card: 'summary',
    title: 'Orbis Dei — Discover Sacred Sites Worldwide',
    description:
      'Explore Catholic churches, shrines, basilicas, and pilgrimage sites on an interactive map.',
  },
};

async function HomePageContent() {
  // Featured sites and map pins are derived from allSites client-side, so the
  // catalog is serialized into the page payload exactly once.
  const [allSites, allTags, appSettings] = await Promise.all([
    getAllSitesSummary(),
    getAllTags(),
    getAppSettings(),
  ]);

  return (
    <HomePageClient
      allSites={allSites}
      allTags={allTags}
      appSettings={appSettings}
    />
  );
}

// The mobile split-view map opens at a fixed view (center [30,10], zoom 1 —
// see HomePageClient's MapViewDynamic props), so the four z=1 OSM tiles it
// shows are known before any JS runs. Leaflet can't request them until its
// chunk loads after hydration, which made a map tile the LCP element at ~8s
// on PageSpeed's Slow-4G run. Preloading pulls the fetches to the start of
// the page load; Leaflet then finds them in cache. Subdomain per tile is
// Leaflet's rotation: abc[(x + y) % 3]. Update these if the initial mobile
// center/zoom ever changes. Desktop starts at zoom 2 (different tiles), so
// the media query keeps phones-only.
const MOBILE_TILE_PRELOADS = [
  'https://a.tile.openstreetmap.org/1/0/0.png',
  'https://b.tile.openstreetmap.org/1/1/0.png',
  'https://b.tile.openstreetmap.org/1/0/1.png',
  'https://c.tile.openstreetmap.org/1/1/1.png',
];

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen">
      {MOBILE_TILE_PRELOADS.map((href) => (
        <link
          key={href}
          rel="preload"
          as="image"
          href={href}
          media="(max-width: 767px)"
          fetchPriority="high"
        />
      ))}
      <Header />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Suspense fallback={<div className="flex-1" />}>
          <HomePageContent />
        </Suspense>
      </main>
    </div>
  );
}
