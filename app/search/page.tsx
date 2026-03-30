import type { Metadata } from 'next';
import Header from '@/components/Header';
import SearchClient from './SearchClient';
import { getAllSites, getAllTags } from '@/lib/data';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

export const metadata: Metadata = {
  title: 'Search — Orbis Dei',
  description: 'Search Catholic churches, shrines, basilicas, and pilgrimage sites worldwide.',
  alternates: { canonical: `${base}/search` },
};

export default async function SearchPage() {
  const [allSites, allTags] = await Promise.all([getAllSites(), getAllTags()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SearchClient allSites={allSites} allTags={allTags} />
    </div>
  );
}
