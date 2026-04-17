import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  getSiteBySlug,
  getNearbySites,
  getTagsForSite,
  getPublicNotesForSite,
  getCreatorInitials,
  getMapPins,
  getAllSitesSummary,
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

type UserContext = {
  authUserId: string | null;
  userRole: string | null;
  userInitialsDisplay: string | null;
};

async function resolveUserContext(): Promise<UserContext> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return { authUserId: null, userRole: null, userInitialsDisplay: null };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, initials_display')
    .eq('id', authUser.id)
    .single();
  return {
    authUserId: authUser.id,
    userRole: profile?.role ?? null,
    userInitialsDisplay: profile?.initials_display ?? null,
  };
}

async function checkPendingEdit(slug: string, userId: string | null, userRole: string | null): Promise<boolean> {
  if (!userId || !userRole || !['contributor', 'administrator'].includes(userRole)) return false;
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('site_edits')
    .select('id')
    .eq('site_id', slug)
    .eq('submitted_by', userId)
    .eq('status', 'pending')
    .limit(1);
  return !!(pending && pending.length > 0);
}

async function SiteDetailContent({ slug }: { slug: string }) {
  const userCtxPromise = resolveUserContext();

  const [site, nearbySites, tags, allMapPins, allSites, allTags, contributorNotes, userCtx] =
    await Promise.all([
      getSiteBySlug(slug),
      getNearbySites(slug, 4),
      getTagsForSite(slug),
      getMapPins(),
      getAllSitesSummary(),
      getAllTags(),
      getPublicNotesForSite(slug),
      userCtxPromise,
    ]);

  if (!site) notFound();

  const [creatorInitialsDisplay, hasPendingEdit] = await Promise.all([
    site.created_by ? getCreatorInitials(site.created_by) : Promise.resolve(null),
    checkPendingEdit(slug, userCtx.authUserId, userCtx.userRole),
  ]);

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteDetailClient
        site={site}
        nearbySites={nearbySites}
        tags={tags}
        contributorNotes={contributorNotes}
        creatorInitialsDisplay={creatorInitialsDisplay}
        userId={userCtx.authUserId}
        userRole={userCtx.userRole}
        userInitialsDisplay={userCtx.userInitialsDisplay}
        hasPendingEdit={hasPendingEdit}
        allMapPins={allMapPins}
        allSites={allSites}
        allTags={allTags}
      />
    </>
  );
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SiteDetailContent slug={slug} />
      </Suspense>
    </div>
  );
}
