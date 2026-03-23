import type { Metadata } from 'next';
import Header from '@/components/Header';
import HomePageClient from './HomePageClient';
import { getAllSites, getAllTags, getFeaturedSites, getMapPins } from '@/lib/data';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.com';

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
  },
  twitter: {
    card: 'summary',
    title: 'Orbis Dei — Discover Sacred Sites Worldwide',
    description:
      'Explore Catholic churches, shrines, basilicas, and pilgrimage sites on an interactive map.',
  },
};

export default async function HomePage() {
  const [allSites, allTags, featuredSites, mapPins] = await Promise.all([
    getAllSites(),
    getAllTags(),
    getFeaturedSites(),
    getMapPins(),
  ]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <HomePageClient
        allSites={allSites}
        allTags={allTags}
        featuredSites={featuredSites}
        mapPins={mapPins}
      />
    </div>
  );
}
