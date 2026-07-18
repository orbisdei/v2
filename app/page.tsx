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

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <Suspense fallback={<div className="flex-1" />}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}
