// ============================================================
// Mobile data access layer — mirrors the web app's lib/data.ts
// query shapes (same tables, same selects) minus Next.js caching.
// All Supabase reads/writes in the mobile app go through here.
// ============================================================

import { supabase } from './supabase';
import type { Site, Tag, MapPin, UserListWithCount } from './types';

// ---- Internal helpers (same row assembly as web) ----

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

const SITE_SUMMARY_SELECT = `
  id, name, native_name, short_description, latitude, longitude, google_maps_url,
  featured, interest, country, region, municipality, updated_at, created_by,
  created_at, coordinates_verified, has_no_image,
  site_images(url, caption, attribution, storage_type, display_order),
  site_tag_assignments(tag_id)
`;

// ---- Sites ----

/** Catalog summary: one image per site, no links. Use in list/map views. */
export async function getAllSitesSummary(): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SUMMARY_SELECT)
    .order('name')
    .order('display_order', { referencedTable: 'site_images' })
    .limit(1, { referencedTable: 'site_images' });
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSiteBySlug(slug: string): Promise<Site | undefined> {
  const { data, error } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .eq('id', slug)
    .single();
  if (error) return undefined;
  return rowToSite(data);
}

export async function getSitesByTag(tagId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from('site_tag_assignments')
    .select(`sites(${SITE_SUMMARY_SELECT})`)
    .eq('tag_id', tagId)
    .order('display_order', { referencedTable: 'sites.site_images' })
    .limit(1, { referencedTable: 'sites.site_images' });
  if (error) throw error;

  const rows = ((data ?? []) as unknown as { sites: Record<string, unknown> | null }[])
    .map((r) => r.sites)
    .filter((r): r is Record<string, unknown> => !!r)
    .map(rowToSite);
  rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  return rows;
}

export async function getMapPins(): Promise<MapPin[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, latitude, longitude, short_description, interest, site_images(url, display_order)')
    .order('display_order', { referencedTable: 'site_images' })
    .limit(1, { referencedTable: 'site_images' });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const imgs = (row.site_images as { url: string; display_order: number }[]) ?? [];
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

// ---- Tags ----

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getFeaturedTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('featured', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getTagBySlug(slug: string): Promise<Tag | undefined> {
  const { data, error } = await supabase.from('tags').select('*').eq('id', slug).single();
  if (error) return undefined;
  return data;
}

export async function getTagsForSite(siteId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('site_tag_assignments')
    .select('tags(*)')
    .eq('site_id', siteId);
  if (error) return [];
  return (data ?? []).map((row) => row.tags as unknown as Tag).filter(Boolean);
}

// ---- User lists ----

export async function getUserLists(userId: string): Promise<UserListWithCount[]> {
  const { data, error } = await supabase
    .from('user_lists')
    .select('id, name, description, is_public, updated_at, user_list_items(site_id)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;

  const lists = (data ?? []) as unknown as {
    id: string;
    name: string;
    description: string;
    is_public: boolean;
    updated_at: string;
    user_list_items: { site_id: string }[];
  }[];

  // Resolve preview thumbnails for the first 3 sites of each list in one query.
  const previewIds = [...new Set(lists.flatMap((l) => l.user_list_items.slice(0, 3).map((i) => i.site_id)))];
  const thumbs = new Map<string, string>();
  if (previewIds.length > 0) {
    const { data: imgRows } = await supabase
      .from('site_images')
      .select('site_id, url, display_order')
      .in('site_id', previewIds)
      .order('display_order');
    for (const row of imgRows ?? []) {
      if (!thumbs.has(row.site_id)) thumbs.set(row.site_id, row.url);
    }
  }

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    is_public: l.is_public,
    updated_at: l.updated_at,
    site_count: l.user_list_items.length,
    preview_thumbnails: l.user_list_items
      .slice(0, 3)
      .map((i) => thumbs.get(i.site_id))
      .filter((u): u is string => !!u),
  }));
}

export async function getListSites(listId: string): Promise<Site[]> {
  const { data, error } = await supabase
    .from('user_list_items')
    .select(`display_order, sites(${SITE_SUMMARY_SELECT})`)
    .eq('list_id', listId)
    .order('display_order');
  if (error) throw error;
  return ((data ?? []) as unknown as { sites: Record<string, unknown> | null }[])
    .map((r) => r.sites)
    .filter((r): r is Record<string, unknown> => !!r)
    .map(rowToSite);
}

export interface ListWithSiteIds {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  site_ids: string[];
}

/** All of a user's lists with their member site ids (for SaveToListPanel). */
export async function getListsWithSiteIds(userId: string): Promise<ListWithSiteIds[]> {
  const { data, error } = await supabase
    .from('user_lists')
    .select('id, name, description, is_public, user_list_items(site_id)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return ((data ?? []) as unknown as (Omit<ListWithSiteIds, 'site_ids'> & {
    user_list_items: { site_id: string }[];
  })[]).map(({ user_list_items, ...list }) => ({
    ...list,
    site_ids: user_list_items.map((i) => i.site_id),
  }));
}

export async function setSiteOnList(listId: string, siteId: string, on: boolean): Promise<boolean> {
  const { error } = on
    ? await supabase.from('user_list_items').insert({ list_id: listId, site_id: siteId })
    : await supabase.from('user_list_items').delete().eq('list_id', listId).eq('site_id', siteId);
  return !error;
}

export async function createList(userId: string, name: string): Promise<ListWithSiteIds | null> {
  const { data, error } = await supabase
    .from('user_lists')
    .insert({ user_id: userId, name: name.trim(), description: '', is_public: false })
    .select('id, name, description, is_public')
    .single();
  if (error || !data) return null;
  return { ...data, site_ids: [] };
}

// ---- Visited sites ----

export async function getVisitedSiteIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('visited_sites').select('site_id').eq('user_id', userId);
  return new Set((data ?? []).map((r: { site_id: string }) => r.site_id));
}

export async function setVisited(userId: string, siteId: string, visited: boolean): Promise<boolean> {
  const { error } = visited
    ? await supabase
        .from('visited_sites')
        .upsert({ user_id: userId, site_id: siteId }, { ignoreDuplicates: true })
    : await supabase.from('visited_sites').delete().eq('user_id', userId).eq('site_id', siteId);
  return !error;
}
