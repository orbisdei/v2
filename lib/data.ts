// ============================================================
// Data access layer — queries Supabase (Phase 2+).
// All functions are async. Swapping this file rewires the app.
// ============================================================

import { createClient } from '@/utils/supabase/server';
import { createStaticClient } from '@/utils/supabase/static';
import { Site, Tag, MapPin, ContributorNote, LinkEntry, CoordinateCandidate, UserListWithCount, UserListDetail, UserListSummary, PublicProfile } from './types';

// ---- Internal helpers ----

/** Assemble a Site from a flat Supabase row + related rows. */
function rowToSite(row: Record<string, unknown>): Site {
  const images = ((row.site_images as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.display_order as number) - (b.display_order as number))
    .map((img) => ({
      url: img.url as string,
      caption: img.caption as string | undefined,
      attribution: img.attribution as string | undefined,
      storage_type: img.storage_type as 'local' | 'external',
      display_order: img.display_order as number,
    }));

  const links = ((row.site_links as Record<string, unknown>[]) ?? []).map((l) => ({
    url: l.url as string,
    link_type: l.link_type as string,
    comment: l.comment as string | undefined,
  }));

  const tag_ids = ((row.site_tag_assignments as Record<string, unknown>[]) ?? []).map(
    (a) => a.tag_id as string
  );

  return {
    id: row.id as string,
    name: row.name as string,
    native_name: row.native_name as string | undefined,
    short_description: row.short_description as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    google_maps_url: row.google_maps_url as string,
    featured: row.featured as boolean,
    interest: row.interest as string | undefined,
    country: row.country as string | undefined,
    region: (row.region as string | null) ?? undefined,
    municipality: row.municipality as string | undefined,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string | undefined,
    created_at: row.created_at as string | undefined,
    coordinates_verified: row.coordinates_verified as boolean | undefined,
    has_no_image: row.has_no_image as boolean | undefined,
    images,
    links,
    tag_ids,
  };
}

const SITE_SELECT = `
  *,
  site_images(*),
  site_links(*),
  site_tag_assignments(tag_id)
`;

// ---- Sites ----

export async function getAllSites(): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSiteBySlug(slug: string): Promise<Site | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .eq('id', slug)
    .single();
  if (error) return undefined;
  return rowToSite(data);
}

export async function getFeaturedSites(): Promise<Site[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .eq('featured', true)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSitesByTag(tagId: string): Promise<Site[]> {
  const supabase = await createClient();
  // Get site_ids for this tag first
  const { data: assignments } = await supabase
    .from('site_tag_assignments')
    .select('site_id')
    .eq('tag_id', tagId);
  if (!assignments || assignments.length === 0) return [];

  const siteIds = assignments.map((a) => a.site_id);
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .in('id', siteIds)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getMapPins(): Promise<MapPin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, latitude, longitude, short_description, interest, site_images(url, display_order)');
  if (error) throw error;

  return (data ?? []).map((row) => {
    const imgs = ((row.site_images as { url: string; display_order: number }[]) ?? [])
      .sort((a, b) => a.display_order - b.display_order);
    return {
      id: row.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      short_description: row.short_description,
      interest: row.interest as string | undefined,
      thumbnail_url: imgs[0]?.url,
    };
  });
}

export async function searchSites(query: string): Promise<Site[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const supabase = await createClient();
  // Search by name or description (Supabase ilike)
  const { data: byText } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .or(`name.ilike.%${q}%,short_description.ilike.%${q}%`);

  // Search by tag name
  const { data: matchingTags } = await supabase
    .from('tags')
    .select('id')
    .ilike('name', `%${q}%`);

  let byTag: typeof byText = [];
  if (matchingTags && matchingTags.length > 0) {
    const tagIds = matchingTags.map((t) => t.id);
    const { data: assignments } = await supabase
      .from('site_tag_assignments')
      .select('site_id')
      .in('tag_id', tagIds);
    if (assignments && assignments.length > 0) {
      const siteIds = [...new Set(assignments.map((a) => a.site_id))];
      const { data } = await supabase
        .from('sites')
        .select(SITE_SELECT)
        .in('id', siteIds);
      byTag = data ?? [];
    }
  }

  // Merge, deduplicate
  const combined = [...(byText ?? []), ...(byTag ?? [])];
  const seen = new Set<string>();
  return combined
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map(rowToSite);
}

// ---- Admin: all sites with image count ----

export async function getAllSitesAdmin(): Promise<(Site & { image_count: number })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sites')
    .select(`
      *,
      site_images(*),
      site_links(*),
      site_tag_assignments(tag_id)
    `)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => {
    const site = rowToSite(row as Record<string, unknown>);
    const image_count = ((row.site_images as unknown[]) ?? []).length;
    return { ...site, image_count };
  });
}

// ---- Admin: coordinate candidates ----

export async function getCoordinateCandidates(siteId: string): Promise<CoordinateCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coordinate_candidates')
    .select('id, site_id, source, latitude, longitude, fetched_at')
    .eq('site_id', siteId);
  if (error) return [];
  return (data ?? []) as CoordinateCandidate[];
}

// ---- Tags ----

export async function getAllTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getAllTagsWithCounts(): Promise<(Tag & { site_count: number })[]> {
  const supabase = await createClient();
  const { data: tags, error } = await supabase
    .from('tags')
    .select('*');
  if (error) throw error;
  if (!tags || tags.length === 0) return [];

  const { data: assignments } = await supabase
    .from('site_tag_assignments')
    .select('tag_id');

  const countMap = new Map<string, number>();
  for (const row of (assignments ?? [])) {
    countMap.set(row.tag_id, (countMap.get(row.tag_id) ?? 0) + 1);
  }

  return tags
    .map((t) => ({ ...t, site_count: countMap.get(t.id) ?? 0 }))
    .sort((a, b) => b.site_count - a.site_count || (a.name ?? '').localeCompare(b.name ?? ''));
}

export async function getTagBySlug(slug: string): Promise<Tag | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', slug)
    .single();
  if (error) return undefined;
  return data;
}

export async function getFeaturedTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('featured', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getChildTagsWithCounts(parentTagId: string): Promise<(Tag & { site_count: number })[]> {
  const supabase = createStaticClient();

  const { data: children } = await supabase
    .from('tags')
    .select('*')
    .eq('parent_tag_id', parentTagId)
    .order('name');

  if (!children || children.length === 0) return [];

  const childIds = children.map((c) => c.id);
  const { data: counts } = await supabase
    .from('site_tag_assignments')
    .select('tag_id')
    .in('tag_id', childIds);

  const countMap = new Map<string, number>();
  for (const row of (counts ?? [])) {
    countMap.set(row.tag_id, (countMap.get(row.tag_id) ?? 0) + 1);
  }

  return children.map((c) => ({ ...c, site_count: countMap.get(c.id) ?? 0 }));
}

export async function getTagsForSite(siteId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_tag_assignments')
    .select('tags(*)')
    .eq('site_id', siteId);
  if (error) return [];
  return (data ?? []).map((row) => row.tags as unknown as Tag).filter(Boolean);
}

// ---- Contributor Notes (restricted: contributor/administrator only) ----

export async function getContributorNotes(siteId: string): Promise<ContributorNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_contributor_notes')
    .select('*, profiles(display_name, initials_display)')
    .eq('site_id', siteId)
    .order('created_at');
  if (error) return []; // RLS will return empty for non-contributors
  return (data ?? []).map((row) => ({
    id: row.id,
    site_id: row.site_id,
    note: row.note,
    created_by: row.created_by,
    created_at: row.created_at,
    author_name: (row.profiles as { display_name: string } | null)?.display_name ?? undefined,
    author_initials_display: (row.profiles as { initials_display: string } | null)?.initials_display ?? undefined,
  }));
}

// ---- Creator attribution ----

export async function getCreatorName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();
  return data?.display_name ?? null;
}

export async function getCreatorInitials(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('initials_display')
    .eq('id', userId)
    .single();
  return data?.initials_display ?? null;
}

// ---- Nearby sites (haversine in-memory after fetch) ----

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getNearbySites(siteId: string, limit = 4): Promise<Site[]> {
  const site = await getSiteBySlug(siteId);
  if (!site) return [];

  // Pre-filter by bounding box (±15°) to avoid loading all sites into memory
  const BOX = 15;
  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .neq('id', siteId)
    .gte('latitude', site.latitude - BOX)
    .lte('latitude', site.latitude + BOX)
    .gte('longitude', site.longitude - BOX)
    .lte('longitude', site.longitude + BOX);

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => ({ site: rowToSite(row), distance: haversineDistance(site.latitude, site.longitude, row.latitude as number, row.longitude as number) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.site);
}

// ---- Admin: pending submissions ----

export async function getPendingSubmissions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pending_submissions')
    .select('*, profiles!submitted_by(display_name)')
    .eq('status', 'pending')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    submitter_name: (row.profiles as { display_name: string } | null)?.display_name ?? 'Unknown',
  }));
}

// ---- Admin: all users ----

export async function getAllUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

// ---- Tag hero image (deterministic daily rotation) ----

export async function getHeroImageForLocationTag(
  tagId: string
): Promise<{ imageUrl: string; siteName: string; siteId: string; imageAttribution: string | null } | null> {
  const supabase = await createClient();

  // Fetch all sites for this tag that have at least one image
  const { data, error } = await supabase
    .from('site_tag_assignments')
    .select('site_id, sites(id, name, site_images(url, display_order, attribution))')
    .eq('tag_id', tagId);

  if (error || !data) return null;

  // Filter to sites that actually have images
  type SiteRow = { site_id: string; sites: { id: string; name: string; site_images: { url: string; display_order: number; attribution: string | null }[] } | null };
  const sitesWithImages = (data as unknown as SiteRow[]).filter(
    (row) => row.sites && row.sites.site_images && row.sites.site_images.length > 0
  );

  if (sitesWithImages.length === 0) return null;

  // Deterministic daily rotation: simple hash of tagId + day index
  const dayIndex = Math.floor(Date.now() / 86400000);
  const hashInput = tagId + dayIndex;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    hash = (hash * 31 + hashInput.charCodeAt(i)) >>> 0;
  }
  const picked = sitesWithImages[hash % sitesWithImages.length];
  const site = picked.sites!;

  // Pick first image by display_order
  const sortedImages = [...site.site_images].sort((a, b) => a.display_order - b.display_order);
  return {
    imageUrl: sortedImages[0].url,
    siteName: site.name,
    siteId: site.id,
    imageAttribution: sortedImages[0].attribution ?? null,
  };
}

// ---- Tag links ----

export async function getTagLinks(tagId: string): Promise<LinkEntry[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from('site_links')
    .select('id, url, link_type, comment')
    .eq('tag_id', tagId);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    link_type: row.link_type,
    comment: row.comment ?? undefined,
  }));
}

// ---- App settings (site_config table) ----

/** Fetch all site_config rows as a key→value map. */
export async function getAppSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_config')
    .select('key, value');
  if (error) throw error;
  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return settings;
}

/** Fetch a single site_config value by key. Returns null if not found. */
export async function getAppSetting(key: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

// ---- Photo digest ----

const INTEREST_ORDER: Record<string, number> = {
  global: 0,
  regional: 1,
  local: 2,
  personal: 3,
};

export async function getSitesWithoutPhotos(): Promise<
  { id: string; name: string; interest: string | null }[]
> {
  const supabase = createStaticClient();
  const { data, error } = await supabase.rpc('get_sites_without_photos');
  if (error) throw error;
  return (data ?? []).sort((a: { id: string; name: string; interest: string | null }, b: { id: string; name: string; interest: string | null }) => {
    const aOrder = INTEREST_ORDER[a.interest ?? 'local'] ?? 2;
    const bOrder = INTEREST_ORDER[b.interest ?? 'local'] ?? 2;
    return aOrder - bOrder;
  });
}

// ---- User lists ----

export async function getUserLists(): Promise<UserListWithCount[]> {
  const supabase = await createClient();

  const { data: lists, error } = await supabase
    .from('user_lists')
    .select('id, name, description, is_public, updated_at')
    .order('updated_at', { ascending: false });

  if (error || !lists) return [];

  const listIds = lists.map(l => l.id);
  if (listIds.length === 0) return [];

  const { data: items } = await supabase
    .from('user_list_items')
    .select('list_id, site_id')
    .in('list_id', listIds);

  const siteIdsByList = new Map<string, string[]>();
  for (const list of lists) siteIdsByList.set(list.id, []);
  for (const item of items ?? []) {
    siteIdsByList.get(item.list_id)?.push(item.site_id);
  }

  const allSiteIds = [...new Set((items ?? []).map(i => i.site_id))];
  const thumbnailMap = new Map<string, string>();
  if (allSiteIds.length > 0) {
    const { data: images } = await supabase
      .from('site_images')
      .select('site_id, url, display_order')
      .in('site_id', allSiteIds)
      .order('display_order', { ascending: true });
    for (const img of images ?? []) {
      if (!thumbnailMap.has(img.site_id)) {
        thumbnailMap.set(img.site_id, img.url);
      }
    }
  }

  return lists.map(list => {
    const siteIds = siteIdsByList.get(list.id) ?? [];
    const previews = siteIds
      .slice(0, 3)
      .map(sid => thumbnailMap.get(sid))
      .filter((url): url is string => !!url);
    return {
      id: list.id,
      name: list.name,
      description: list.description ?? '',
      is_public: list.is_public,
      site_count: siteIds.length,
      updated_at: list.updated_at,
      preview_thumbnails: previews,
    };
  });
}

export async function getListById(listId: string): Promise<UserListDetail | null> {
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from('user_lists')
    .select('id, name, description, is_public, user_id, updated_at')
    .eq('id', listId)
    .single();

  if (error || !list) return null;

  const { data: owner } = await supabase
    .from('profiles')
    .select('display_name, initials_display, avatar_url')
    .eq('id', list.user_id)
    .single();

  const { data: items } = await supabase
    .from('user_list_items')
    .select('site_id, display_order')
    .eq('list_id', listId)
    .order('display_order', { ascending: true });

  const siteIds = (items ?? []).map(i => i.site_id);

  let sites: Site[] = [];
  if (siteIds.length > 0) {
    const { data: siteRows } = await supabase
      .from('sites')
      .select(SITE_SELECT)
      .in('id', siteIds);

    const siteMap = new Map((siteRows ?? []).map(r => [r.id, r]));
    sites = siteIds
      .map(id => siteMap.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map(r => rowToSite(r as Record<string, unknown>));
  }

  return {
    id: list.id,
    name: list.name,
    description: list.description ?? '',
    is_public: list.is_public,
    user_id: list.user_id,
    owner_display_name: owner?.display_name ?? null,
    owner_initials_display: owner?.initials_display ?? '',
    owner_avatar_url: owner?.avatar_url ?? null,
    sites,
  };
}

export async function getPublicListsForUser(userId: string): Promise<UserListSummary[]> {
  const supabase = await createClient();

  const { data: lists } = await supabase
    .from('user_lists')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false });

  if (!lists || lists.length === 0) return [];

  const listIds = lists.map(l => l.id);
  const { data: items } = await supabase
    .from('user_list_items')
    .select('list_id, site_id')
    .in('list_id', listIds);

  const siteIdsByList = new Map<string, string[]>();
  for (const list of lists) siteIdsByList.set(list.id, []);
  for (const item of items ?? []) {
    siteIdsByList.get(item.list_id)?.push(item.site_id);
  }

  const allSiteIds = [...new Set((items ?? []).map(i => i.site_id))];
  const thumbnailMap = new Map<string, string>();
  if (allSiteIds.length > 0) {
    const { data: images } = await supabase
      .from('site_images')
      .select('site_id, url, display_order')
      .in('site_id', allSiteIds)
      .order('display_order', { ascending: true });
    for (const img of images ?? []) {
      if (!thumbnailMap.has(img.site_id)) thumbnailMap.set(img.site_id, img.url);
    }
  }

  return lists.map(list => {
    const siteIds = siteIdsByList.get(list.id) ?? [];
    return {
      id: list.id,
      name: list.name,
      site_count: siteIds.length,
      preview_thumbnails: siteIds.slice(0, 3).map(sid => thumbnailMap.get(sid)).filter((u): u is string => !!u),
    };
  });
}

export async function getProfileByInitials(initialsDisplay: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, initials, initials_display, about_me, role, created_at')
    .eq('initials_display', initialsDisplay)
    .single();
  if (error || !data) return null;
  return data as PublicProfile;
}

export async function getVisitedCountForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('visited_sites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) return 0;
  return count ?? 0;
}

// ---- Public contributor notes (public read per updated RLS) ----

export async function getPublicNotesForSite(
  siteId: string
): Promise<Array<{ id: string; site_id: string; note: string; created_by: string; created_at: string; author_initials_display: string | undefined }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_contributor_notes')
    .select('id, site_id, note, created_by, created_at, profiles(initials_display)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    site_id: row.site_id,
    note: row.note,
    created_by: row.created_by,
    created_at: row.created_at,
    author_initials_display: (Array.isArray(row.profiles) ? row.profiles[0]?.initials_display : (row.profiles as { initials_display: string } | null)?.initials_display) ?? undefined,
  }));
}
