import { notFound } from 'next/navigation';
import {
  getSiteBySlug,
  getNearbySites,
  getTagsForSite,
  getContributorNotes,
  getCreatorInitials,
} from '@/lib/data';
import { createClient } from '@/utils/supabase/server';
import { createStaticClient } from '@/utils/supabase/static';
import Header from '@/components/Header';
import SiteDetailClient from './SiteDetailClient';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase.from('sites').select('id');
  return (data ?? []).map((row) => ({ slug: row.id }));
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

  const isContributorOrAdmin =
    userRole && ['contributor', 'administrator'].includes(userRole);

  // Fetch contributor notes only for contributors/admins
  const contributorNotes = isContributorOrAdmin ? await getContributorNotes(slug) : [];

  // Check for pending edit by this user
  let hasPendingEdit = false;
  if (authUser && isContributorOrAdmin) {
    const { data: pending } = await supabase
      .from('site_edits')
      .select('id')
      .eq('site_id', slug)
      .eq('submitted_by', authUser.id)
      .eq('status', 'pending')
      .limit(1);
    hasPendingEdit = !!(pending && pending.length > 0);
  }

  // Resolve creator initials
  const creatorInitialsDisplay = site.created_by ? await getCreatorInitials(site.created_by) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SiteDetailClient
        site={site}
        nearbySites={nearbySites}
        tags={tags}
        contributorNotes={contributorNotes}
        creatorInitialsDisplay={creatorInitialsDisplay}
        userRole={userRole}
        hasPendingEdit={hasPendingEdit}
      />
    </div>
  );
}
