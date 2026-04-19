import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getListById, getAllTags } from '@/lib/data';
import Header from '@/components/Header';
import ListDetailClient from './ListDetailClient';
import type { Metadata } from 'next';
import type { MapPin } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const list = await getListById(id);
  if (!list) return { title: 'List Not Found — Orbis Dei' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const canonical = `${base}/list/${id}`;
  const desc = list.description || `A curated list of ${list.sites.length} holy sites on Orbis Dei`;

  return {
    title: `${list.name} — Orbis Dei`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: list.name,
      description: desc,
      url: canonical,
      type: 'website',
      images: list.sites[0]?.images[0] ? [{ url: list.sites[0].images[0].url }] : [],
    },
  };
}

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [list, allTags] = await Promise.all([getListById(id), getAllTags()]);
  if (!list) notFound();

  const isOwner = !!user && user.id === list.user_id;

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
      <ListDetailClient list={list} pins={pins} isOwner={isOwner} allTags={allTags} />
    </div>
  );
}
