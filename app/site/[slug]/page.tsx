import { notFound } from 'next/navigation';
import {
  getAllSites,
  getSiteBySlug,
  getNearbySites,
  getTagsForSite,
  getContributorNotes,
  getCreatorName,
} from '@/lib/data';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import SiteDetailClient from './SiteDetailClient';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const sites = await getAllSites();
  return sites.map((site) => ({ slug: site.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  if (!site) return { title: 'Site Not Found — Orbis Dei' };

  return {
    title: `${site.name} — Orbis Dei`,
    description: site.short_description,
    openGraph: {
      title: site.name,
      description: site.short_description,
      images: site.images[0] ? [{ url: site.images[0].url }] : [],
    },
  };
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  const [site, nearbySites, tags] = await Promise.all([
    getSiteBySlug(slug),
    getNearbySites(slug, 4),
    getTagsForSite(slug),
  ]);

  if (!site) notFound();

  // Fetch contributor notes only for contributors/admins
  const contributorNotes =
    userRole && ['contributor', 'administrator'].includes(userRole)
      ? await getContributorNotes(slug)
      : [];

  // Resolve creator display name
  const creatorName = site.created_by ? await getCreatorName(site.created_by) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SiteDetailClient
        site={site}
        nearbySites={nearbySites}
        tags={tags}
        contributorNotes={contributorNotes}
        creatorName={creatorName}
      />
    </div>
  );
}
