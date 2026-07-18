import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVisitedSitesAsList, getAllTags } from '@/lib/data';
import Header from '@/components/Header';
import ListDetailClient from '../[id]/ListDetailClient';
import type { Metadata } from 'next';
import type { MapPin } from '@/lib/types';

export const metadata: Metadata = { title: 'Visited Sites — Orbis Dei' };

export default async function VisitedListPage() {
  const supabase = await createClient();
  // Local JWT verification (see proxy.ts) — avoids an auth-server round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims.sub) redirect('/');

  const [list, allTags] = await Promise.all([getVisitedSitesAsList(), getAllTags()]);
  if (!list) redirect('/lists');

  // Popup cards resolve full site data from list.sites (already serialized),
  // so pins stay lightweight — no descriptions in the payload.
  const pins: MapPin[] = list.sites.map(s => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    interest: s.interest,
    thumbnail_url: s.images[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ListDetailClient list={list} pins={pins} isOwner={false} allTags={allTags} isVisited />
    </div>
  );
}
