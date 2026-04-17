import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import SearchClient from './SearchClient';
import { getAllSitesSummary, getAllTags } from '@/lib/data';
import { createClient } from '@/utils/supabase/server';

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

export const metadata: Metadata = {
  title: 'Search — Orbis Dei',
  description: 'Search Catholic churches, shrines, basilicas, and pilgrimage sites worldwide.',
  alternates: { canonical: `${base}/search` },
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

async function SearchContent() {
  const [userRole, allSites, allTags] = await Promise.all([
    resolveUserRole(),
    getAllSitesSummary(),
    getAllTags(),
  ]);
  return <SearchClient allSites={allSites} allTags={allTags} userRole={userRole} />;
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
