// ============================================================
// Mobile data access layer — mirrors the web app's lib/data.ts
// query shapes (same tables, same selects) minus Next.js caching.
// All Supabase reads/writes in the mobile app go through here.
// ============================================================

import { supabase } from './supabase';
import { rowToSite, SITE_SELECT, SITE_SUMMARY_SELECT } from '@orbisdei/shared/src/siteRow';
import type {
  Site,
  Tag,
  MapPin,
  PublicProfile,
  UserListDetail,
  UserListSummary,
  UserListWithCount,
} from './types';

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

/** List metadata + owner attribution + ordered sites (mirrors web getListById). */
export async function getListDetail(listId: string): Promise<UserListDetail | null> {
  const { data: list, error } = await supabase
    .from('user_lists')
    .select(
      `id, name, description, is_public, user_id, updated_at,
       user_list_items(site_id, display_order, sites(${SITE_SUMMARY_SELECT}))`
    )
    .eq('id', listId)
    .single();
  if (error || !list) return null;

  const { data: owner } = await supabase
    .from('profiles')
    .select('display_name, initials_display, avatar_url')
    .eq('id', list.user_id)
    .single();

  type ItemRow = { site_id: string; display_order: number; sites: Record<string, unknown> | null };
  const items = ((list.user_list_items ?? []) as unknown as ItemRow[])
    .slice()
    .sort((a, b) => a.display_order - b.display_order);

  return {
    id: list.id,
    name: list.name,
    description: list.description ?? '',
    is_public: list.is_public,
    user_id: list.user_id,
    owner_display_name: owner?.display_name ?? null,
    owner_initials_display: owner?.initials_display ?? '',
    owner_avatar_url: owner?.avatar_url ?? null,
    sites: items
      .map((i) => i.sites)
      .filter((r): r is Record<string, unknown> => !!r)
      .map(rowToSite),
  };
}

// ---- Public profiles ----

export async function getProfileByInitials(initialsDisplay: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, initials, initials_display, about_me, role, created_at')
    .eq('initials_display', initialsDisplay)
    .single();
  if (error || !data) return null;
  return data as PublicProfile;
}

export async function getVisitedCountForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('visited_sites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) return 0;
  return count ?? 0;
}

export async function getPublicListsForUser(userId: string): Promise<UserListSummary[]> {
  const { data: lists } = await supabase
    .from('user_lists')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('updated_at', { ascending: false });
  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);
  const { data: items } = await supabase
    .from('user_list_items')
    .select('list_id, site_id')
    .in('list_id', listIds);

  const siteIdsByList = new Map<string, string[]>();
  for (const list of lists) siteIdsByList.set(list.id, []);
  for (const item of items ?? []) {
    siteIdsByList.get(item.list_id)?.push(item.site_id);
  }

  const allSiteIds = [...new Set((items ?? []).map((i) => i.site_id))];
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

  return lists.map((list) => {
    const siteIds = siteIdsByList.get(list.id) ?? [];
    return {
      id: list.id,
      name: list.name,
      site_count: siteIds.length,
      preview_thumbnails: siteIds
        .slice(0, 3)
        .map((sid) => thumbnailMap.get(sid))
        .filter((u): u is string => !!u),
    };
  });
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
