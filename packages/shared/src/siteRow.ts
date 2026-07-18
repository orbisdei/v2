// Supabase row → Site assembly + the select strings that shape those rows.
// Shared by the web data layer (lib/data.ts) and the mobile data layer
// (mobile/src/lib/data.ts) so the query shapes can never drift apart.

import type { Site } from './types';

/** Assemble a Site from a flat Supabase row + related rows. */
export function rowToSite(row: Record<string, unknown>): Site {
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

  const celebrations = ((row.site_celebrations as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.display_order as number) - (b.display_order as number))
    .map((c) => ({
      date_label: c.date_label as string,
      description: c.description as string,
      display_order: c.display_order as number,
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
    celebrations,
    tag_ids,
  };
}

export const SITE_SELECT = `
  *,
  site_images(*),
  site_links(*),
  site_celebrations(*),
  site_tag_assignments(tag_id)
`;

// Summary select: omits site_links, which list/map views never render.
// Returned rows are still Site-shaped (links default to [] in rowToSite).
// Catalog-wide queries additionally cap the site_images embed at ONE row per
// site (ordered by display_order) — list/map views only ever render
// images[0], and multi-image sites were multiplying the payload.
export const SITE_SUMMARY_SELECT = `
  id, name, native_name, short_description, latitude, longitude, google_maps_url,
  featured, interest, country, region, municipality, updated_at, created_by,
  created_at, coordinates_verified, has_no_image,
  site_images(url, caption, attribution, storage_type, display_order),
  site_tag_assignments(tag_id)
`;
