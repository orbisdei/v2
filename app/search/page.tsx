import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import SearchClient from './SearchClient';
import { getAllSitesSummary, getAllTags } from '@/lib/data';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

// Statically rendered + ISR; role resolves client-side via ProfileContext.
// Data busts via revalidateTag, so the timer is only a fallback — hourly
// revalidation burns ISR write units.
export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'Search — Orbis Dei',
  description: 'Search Catholic churches, shrines, basilicas, and pilgrimage sites worldwide.',
  alternates: { canonical: `${base}/search` },
};

async function SearchContent() {
  const [allSites, allTags] = await Promise.all([
    getAllSitesSummary(),
    getAllTags(),
  ]);
  return <SearchClient allSites={allSites} allTags={allTags} />;
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
