import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import SearchClient from './SearchClient';
import { getAllSites, getAllTags } from '@/lib/data';
import { createClient } from '@/utils/supabase/server';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

export const metadata: Metadata = {
  title: 'Search — Orbis Dei',
  description: 'Search Catholic churches, shrines, basilicas, and pilgrimage sites worldwide.',
  alternates: { canonical: `${base}/search` },
};

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let userRole: string | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();
    userRole = profile?.role ?? null;
  }

  const [allSites, allTags] = await Promise.all([getAllSites(), getAllTags()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={null}>
        <SearchClient allSites={allSites} allTags={allTags} userRole={userRole} />
      </Suspense>
    </div>
  );
}
