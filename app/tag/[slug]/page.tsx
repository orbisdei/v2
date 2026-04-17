import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTagBySlug, getSitesByTag, getCreatorInitials, getAllTags, getChildTagsWithCounts, getHeroImageForLocationTag, getTagLinks, getAppSettings } from '@/lib/data';
import { createStaticClient } from '@/utils/supabase/static';
import { createClient } from '@/utils/supabase/server';
import { getCountryName } from '@/lib/countries';
import Header from '@/components/Header';
import TagPageClient from './TagPageClient';
import type { Metadata } from 'next';
import type { MapPin } from '@/lib/types';

const LOCATION_TYPES = ['country', 'region', 'municipality'] as const;
type LocationType = typeof LOCATION_TYPES[number];

function isLocationTag(type: string | null | undefined): type is LocationType {
  return LOCATION_TYPES.includes(type as LocationType);
}

function buildAutoDescription(
  type: LocationType,
  tagName: string,
  siteCount: number,
  parentName: string
): string {
  const siteWord = `Catholic and Christian holy site${siteCount === 1 ? '' : 's'}`;
  if (type === 'country') {
    return `Explore ${siteCount} ${siteWord} in ${tagName}.`;
  }
  return `Explore ${siteCount} ${siteWord} in ${tagName}, ${parentName}.`;
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase.from('tags').select('id');
  return (data ?? []).map((row) => ({ slug: row.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: 'Tag Not Found — Orbis Dei' };

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const canonical = `${base}/tag/${slug}`;

  const isLocation = isLocationTag(tag.type);

  // Resolve parent for description
  const parentTag = tag.parent_tag_id ? await getTagBySlug(tag.parent_tag_id) : null;

  // Compute displayDescription
  let displayDescription: string;
  if (tag.description) {
    displayDescription = tag.description;
  } else if (isLocation) {
    const sites = await getSitesByTag(tag.id);
    const siteCount = sites.length;
    displayDescription = buildAutoDescription(
      tag.type as LocationType,
      tag.name,
      siteCount,
      parentTag?.name ?? getCountryName(tag.country_code ?? '') ?? ''
    );
  } else {
    displayDescription = tag.description ?? '';
  }

  // Resolve OG image
  let ogImageUrl: string | null = tag.image_url ?? null;
  if (!ogImageUrl && isLocation) {
    const hero = await getHeroImageForLocationTag(tag.id);
    ogImageUrl = hero?.imageUrl ?? null;
  }

  const title = isLocation
    ? `Catholic Sites in ${tag.name} — Orbis Dei`
    : `${tag.name} — Orbis Dei`;

  return {
    title,
    description: displayDescription,
    alternates: { canonical },
    openGraph: {
      title,
      description: displayDescription,
      url: canonical,
      type: 'website',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description: displayDescription,
    },
  };
}

async function resolveAuth(): Promise<{ userId: string | null; userRole: string | null }> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { userId: null, userRole: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();
  return { userId: authUser.id, userRole: profile?.role ?? null };
}

async function checkPendingTagEdit(tagId: string, userId: string | null, userRole: string | null): Promise<boolean> {
  if (!userId || !userRole || !['contributor', 'administrator'].includes(userRole)) return false;
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('pending_submissions')
    .select('id')
    .eq('type', 'tag')
    .eq('submitted_by', userId)
    .eq('status', 'pending')
    .filter('payload->>tag_id', 'eq', tagId)
    .limit(1);
  return !!(pending && pending.length > 0);
}

async function TagPageContent({ slug }: { slug: string }) {
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const isLocation = isLocationTag(tag.type);

  const [auth, sites, allTags, creatorName, tagLinks, appSettings, childTags, parentTag, heroPayload] =
    await Promise.all([
      resolveAuth(),
      getSitesByTag(tag.id),
      getAllTags(),
      tag.created_by ? getCreatorInitials(tag.created_by) : Promise.resolve(null),
      getTagLinks(tag.id),
      getAppSettings(),
      (tag.type === 'country' || tag.type === 'region')
        ? getChildTagsWithCounts(tag.id)
        : Promise.resolve([] as (Awaited<ReturnType<typeof getChildTagsWithCounts>>)),
      tag.parent_tag_id ? getTagBySlug(tag.parent_tag_id) : Promise.resolve(undefined),
      (isLocation && !tag.image_url) ? getHeroImageForLocationTag(tag.id) : Promise.resolve(null),
    ]);

  sites.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  const [grandparentTag, hasPendingEdit] = await Promise.all([
    parentTag?.parent_tag_id ? getTagBySlug(parentTag.parent_tag_id) : Promise.resolve(undefined),
    checkPendingTagEdit(tag.id, auth.userId, auth.userRole),
  ]);

  const heroImageUrl = heroPayload?.imageUrl ?? null;
  const heroImageAttribution = heroPayload?.imageAttribution ?? null;
  const heroSiteName = heroPayload?.siteName ?? null;
  const heroSiteId = heroPayload?.siteId ?? null;

  const siteCount = sites.length;
  let displayDescription: string;
  if (tag.description) {
    displayDescription = tag.description;
  } else if (isLocation) {
    displayDescription = buildAutoDescription(
      tag.type as LocationType,
      tag.name,
      siteCount,
      parentTag?.name ?? getCountryName(tag.country_code ?? '') ?? ''
    );
  } else {
    displayDescription = '';
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const ogImageUrl = tag.image_url ?? heroImageUrl;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: tag.name,
    description: displayDescription,
    url: `${base}/tag/${tag.id}`,
    ...(ogImageUrl ? { image: ogImageUrl } : {}),
  };

  const pins: MapPin[] = sites.map((s) => ({
    id: s.id,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    short_description: s.short_description,
    thumbnail_url: s.images[0]?.url,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TagPageClient
        tag={tag}
        sites={sites}
        pins={pins}
        allTags={allTags}
        creatorName={creatorName}
        childTags={childTags}
        parentTag={parentTag ?? null}
        grandparentTag={grandparentTag ?? null}
        displayDescription={displayDescription}
        heroImageUrl={heroImageUrl}
        heroImageAttribution={heroImageAttribution}
        heroSiteName={heroSiteName}
        heroSiteId={heroSiteId}
        userRole={auth.userRole}
        userId={auth.userId}
        hasPendingEdit={hasPendingEdit}
        tagLinks={tagLinks}
        appSettings={appSettings}
      />
    </>
  );
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <TagPageContent slug={slug} />
      </Suspense>
    </div>
  );
}
