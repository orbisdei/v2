import { notFound } from 'next/navigation';
import {
  getSiteBySlug,
  getNearbySites,
  getTagsForSite,
  getPublicNotesForSite,
  getCreatorInitials,
  getMapPins,
  getAllSites,
  getAllTags,
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

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const canonical = `${base}/site/${slug}`;

  return {
    title: `${site.name} — Orbis Dei`,
    description: site.short_description,
    alternates: { canonical },
    openGraph: {
      title: site.name,
      description: site.short_description,
      url: canonical,
      type: 'website',
      images: site.images[0] ? [{ url: site.images[0].url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: site.name,
      description: site.short_description,
      images: site.images[0] ? [site.images[0].url] : [],
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
  let userInitialsDisplay: string | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, initials_display')
      .eq('id', authUser.id)
      .single();
    userRole = profile?.role ?? null;
    userInitialsDisplay = profile?.initials_display ?? null;
  }

  const [site, nearbySites, tags, allMapPins, allSites, allTags] = await Promise.all([
    getSiteBySlug(slug),
    getNearbySites(slug, 4),
    getTagsForSite(slug),
    getMapPins(),
    getAllSites(),
    getAllTags(),
  ]);

  if (!site) notFound();

  const isContributorOrAdmin =
    userRole && ['contributor', 'administrator'].includes(userRole);

  // Fetch contributor notes for all visitors (RLS allows public read)
  const contributorNotes = await getPublicNotesForSite(slug);

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

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ["PlaceOfWorship", "TouristAttraction"],
    name: site.name,
    description: site.short_description,
    url: `${base}/site/${site.id}`,
    ...(site.latitude && site.longitude ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: site.latitude,
        longitude: site.longitude,
      },
    } : {}),
    ...(site.images[0] ? { image: site.images[0].url } : {}),
    ...(site.google_maps_url ? { hasMap: site.google_maps_url } : {}),
    isAccessibleForFree: true,
    ...(site.municipality || site.country
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(site.municipality ? { addressLocality: site.municipality } : {}),
            ...(site.country ? { addressCountry: site.country } : {}),
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <SiteDetailClient
        site={site}
        nearbySites={nearbySites}
        tags={tags}
        contributorNotes={contributorNotes}
        creatorInitialsDisplay={creatorInitialsDisplay}
        userId={authUser?.id ?? null}
        userRole={userRole}
        userInitialsDisplay={userInitialsDisplay}
        hasPendingEdit={hasPendingEdit}
        allMapPins={allMapPins}
        allSites={allSites}
        allTags={allTags}
      />
    </div>
  );
}
