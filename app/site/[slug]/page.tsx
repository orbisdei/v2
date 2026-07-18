import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  getSiteBySlug,
  getSlugRedirect,
  getTagsForSite,
  getPublicNotesForSite,
  getCreatorInitials,
  getMapPins,
} from '@/lib/data';
import { createStaticClient } from '@/utils/supabase/static';
import { cfImageOpt } from '@/lib/imageUrl';
import Header from '@/components/Header';
import SiteDetailClient from './SiteDetailClient';
import type { Metadata } from 'next';

// Statically generated (generateStaticParams) + ISR. Everything fetched here
// uses the cookie-free static client; user-specific state (role, pending-edit
// badge, note authoring) resolves client-side in SiteDetailClient, so the
// public HTML is cacheable. Mutations bust it via revalidateTag(SITES_TAG),
// so the timer is only a fallback — keep it at a day: hourly revalidation
// across all site/tag pages was burning ~15k+ Vercel ISR write units per day.
export const revalidate = 86400; // 24 hours

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
  const ogImage = cfImageOpt(site.images[0]?.url, 1200);

  return {
    title: `${site.name} — Orbis Dei`,
    description: site.short_description,
    alternates: { canonical },
    openGraph: {
      title: site.name,
      description: site.short_description,
      url: canonical,
      type: 'website',
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: site.name,
      description: site.short_description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

async function SiteDetailContent({ slug }: { slug: string }) {
  const site = await getSiteBySlug(slug);
  if (!site) notFound(); // unreachable: SiteDetailPage already resolved the slug

  // Maps get lightweight pins only; popup cards for other sites hydrate
  // on demand via /api/site-card/[id] instead of shipping the catalog here.
  const [tags, allMapPins, contributorNotes, creatorInitialsDisplay] =
    await Promise.all([
      getTagsForSite(slug),
      getMapPins(),
      getPublicNotesForSite(slug),
      site.created_by ? getCreatorInitials(site.created_by) : Promise.resolve(null),
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
        tags={tags}
        contributorNotes={contributorNotes}
        creatorInitialsDisplay={creatorInitialsDisplay}
        allMapPins={allMapPins}
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

  // Resolve the slug BEFORE the Suspense boundary: once streaming starts the
  // 200 status is committed, so notFound()/redirects inside it degrade to
  // noindex meta tags. getSiteBySlug is unstable_cache'd, so the content
  // component's identical call below is a cache hit, and the redirect table
  // is only consulted on the miss path.
  const site = await getSiteBySlug(slug);
  if (!site) {
    const target = await getSlugRedirect('site', slug);
    if (target) permanentRedirect(`/site/${target}`);
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <SiteDetailContent slug={slug} />
      </Suspense>
    </div>
  );
}
