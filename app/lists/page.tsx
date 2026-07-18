import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserLists, getVisitedListSummary } from '@/lib/data';
import Header from '@/components/Header';
import ListsClient from './ListsClient';

export const metadata = { title: 'My Lists — Orbis Dei' };

export default async function ListsPage() {
  const supabase = await createClient();
  // Local JWT verification (see proxy.ts) — avoids an auth-server round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims.sub) redirect('/');

  const [lists, visitedSummary] = await Promise.all([
    getUserLists(),
    getVisitedListSummary(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ListsClient initialLists={lists} visitedSummary={visitedSummary} />
    </div>
  );
}
