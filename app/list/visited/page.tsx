import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getVisitedSitesAsList } from '@/lib/data';
import Header from '@/components/Header';
import ListDetailClient from '../[id]/ListDetailClient';
import type { Metadata } from 'next';
import type { MapPin } from '@/lib/types';

export const metadata: Metadata = { title: 'Visited Sites — Orbis Dei' };

export default async function VisitedListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const list = await getVisitedSitesAsList();
  if (!list) redirect('/lists');

  const pins: MapPin[] = list.sites.map(s => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    short_description: s.short_description,
    interest: s.interest,
    thumbnail_url: s.images[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ListDetailClient list={list} pins={pins} isOwner={false} isVisited />
    </div>
  );
}
