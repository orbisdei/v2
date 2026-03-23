import { notFound } from 'next/navigation';
import { getTagBySlug, getSitesByTag, getCreatorName, getAllTags } from '@/lib/data';
import { createStaticClient } from '@/utils/supabase/static';
import Header from '@/components/Header';
import TagPageClient from './TagPageClient';
import type { Metadata } from 'next';
import type { MapPin, Tag } from '@/lib/types';

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase.from('tags').select('id');
  return (data ?? []).map((row) => ({ slug: row.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: 'Tag Not Found — Orbis Dei' };
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.com';
  const canonical = `${base}/tag/${slug}`;
  return {
    title: `${tag.name} — Orbis Dei`,
    description: tag.description,
    alternates: { canonical },
    openGraph: {
      title: `${tag.name} — Orbis Dei`,
      description: tag.description ?? undefined,
      url: canonical,
      type: 'website',
      ...(tag.image_url ? { images: [{ url: tag.image_url }] } : {}),
    },
    twitter: {
      card: 'summary',
      title: `${tag.name} — Orbis Dei`,
      description: tag.description ?? undefined,
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [sites, allTags, creatorName] = await Promise.all([
    getSitesByTag(tag.id),
    getAllTags(),
    tag.created_by ? getCreatorName(tag.created_by) : Promise.resolve(null),
  ]);

  const pins: MapPin[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    short_description: s.short_description,
    thumbnail_url: s.images[0]?.url,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <TagPageClient
        tag={tag}
        sites={sites}
        pins={pins}
        allTags={allTags}
        creatorName={creatorName}
      />
    </div>
  );
}
