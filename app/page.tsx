import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import HomePageClient from './HomePageClient';
import { getAllSitesSummary, getAllTags, getFeaturedSites, getMapPins, getAppSettings } from '@/lib/data';
import { createClient } from '@/utils/supabase/server';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

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

async function resolveUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();
  return profile?.role ?? null;
}

async function HomePageContent() {
  // Public data (cached) runs in parallel with the cookie-bound auth/profile lookup.
  const [userRole, allSites, allTags, featuredSites, mapPins, appSettings] = await Promise.all([
    resolveUserRole(),
    getAllSitesSummary(),
    getAllTags(),
    getFeaturedSites(),
    getMapPins(),
    getAppSettings(),
  ]);

  return (
    <HomePageClient
      allSites={allSites}
      allTags={allTags}
      featuredSites={featuredSites}
      mapPins={mapPins}
      appSettings={appSettings}
      userRole={userRole}
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
