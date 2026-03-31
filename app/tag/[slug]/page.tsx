import { notFound } from 'next/navigation';
import { getTagBySlug, getSitesByTag, getCreatorName, getAllTags, getChildTagsWithCounts, getHeroImageForLocationTag, getTagLinks } from '@/lib/data';
import { createStaticClient } from '@/utils/supabase/static';
import { createClient } from '@/utils/supabase/server';
import { getCountryName } from '@/lib/countries';
import Header from '@/components/Header';
import TagPageClient from './TagPageClient';
import type { Metadata } from 'next';
import type { MapPin, Tag, LinkEntry } from '@/lib/types';

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

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  // Auth
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userId = authUser?.id ?? null;

  let userRole: string | null = null;
  if (authUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single();
    userRole = profile?.role ?? null;
  }

  const [sites, allTags, creatorName, tagLinks] = await Promise.all([
    getSitesByTag(tag.id),
    getAllTags(),
    tag.created_by ? getCreatorName(tag.created_by) : Promise.resolve(null),
    getTagLinks(tag.id),
  ]);

  // Sort: featured first, then alphabetical
  sites.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  const childTags = (tag.type === 'country' || tag.type === 'region')
    ? await getChildTagsWithCounts(tag.id)
    : [];

  const parentTag = tag.parent_tag_id ? await getTagBySlug(tag.parent_tag_id) : null;
  const grandparentTag = parentTag?.parent_tag_id ? await getTagBySlug(parentTag.parent_tag_id) : null;

  const isLocation = isLocationTag(tag.type);

  // Hero image for location tags without a manual image_url
  let heroImageUrl: string | null = null;
  let heroSiteName: string | null = null;
  let heroSiteId: string | null = null;
  if (isLocation && !tag.image_url) {
    const hero = await getHeroImageForLocationTag(tag.id);
    if (hero) {
      heroImageUrl = hero.imageUrl;
      heroSiteName = hero.siteName;
      heroSiteId = hero.siteId;
    }
  }

  // Compute displayDescription
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

  // Check for pending tag edit by this user
  let hasPendingEdit = false;
  const isContributorOrAdmin = userRole && ['contributor', 'administrator'].includes(userRole);
  if (userId && isContributorOrAdmin) {
    const { data: pending } = await supabase
      .from('pending_submissions')
      .select('id')
      .eq('type', 'tag')
      .eq('submitted_by', userId)
      .eq('status', 'pending')
      .filter('payload->>tag_id', 'eq', tag.id)
      .limit(1);
    hasPendingEdit = !!(pending && pending.length > 0);
  }

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
        childTags={childTags}
        parentTag={parentTag ?? null}
        grandparentTag={grandparentTag ?? null}
        displayDescription={displayDescription}
        heroImageUrl={heroImageUrl}
        heroSiteName={heroSiteName}
        heroSiteId={heroSiteId}
        userRole={userRole}
        userId={userId}
        hasPendingEdit={hasPendingEdit}
        tagLinks={tagLinks}
      />
    </div>
  );
}
