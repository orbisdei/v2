// ============================================================
// Data access layer — queries Supabase (Phase 2+).
// All functions are async. Swapping this file rewires the app.
// ============================================================

import { createClient } from '@/utils/supabase/server';
import { Site, Tag, MapPin, ContributorNote } from './types';

// ---- Internal helpers ----

/** Assemble a Site from a flat Supabase row + related rows. */
function rowToSite(row: Record<string, unknown>): Site {
  const images = ((row.site_images as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.display_order as number) - (b.display_order as number))
    .map((img) => ({
      url: img.url as string,
      caption: img.caption as string | undefined,
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
    short_description: row.short_description as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    google_maps_url: row.google_maps_url as string,
    featured: row.featured as boolean,
    interest: row.interest as string | undefined,
    contributor: row.contributor as string | undefined,
    updated_at: row.updated_at as string,
    created_by: row.created_by as string | undefined,
    created_at: row.created_at as string | undefined,
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
    .select('id, name, latitude, longitude, short_description, site_images(url, display_order)');
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
    .select('*, profiles(display_name)')
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
  }));
}

// ---- Creator attribution (join profiles.display_name) ----

export async function getCreatorName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();
  return data?.display_name ?? null;
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

  const supabase = await createClient();
  const { data } = await supabase
    .from('sites')
    .select(SITE_SELECT)
    .neq('id', siteId);

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
    .select('*, profiles(display_name)')
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
