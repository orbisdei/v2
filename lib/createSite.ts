import { SupabaseClient } from '@supabase/supabase-js';
import { syncLocationTags } from '@/lib/locationTags';
import type { LinkEntry, CelebrationEntry } from '@/lib/types';
import type { SiteFormValues, ImageEntry } from '@/components/admin/SiteForm';

/**
 * The one gate every site-creating/editing write path runs coordinates
 * through before they reach `sites` — createSiteWithRelations (new sites) and
 * /api/publish-site-edit (existing-site edits, including the admin
 * SiteAccordionEditor and approved contributor site_edits). Add any future
 * coordinate validation here once, rather than per-caller.
 *
 * Rejects missing/non-numeric/out-of-range values, and the (0,0) Gulf-of-
 * Guinea placeholder specifically — that value only ever appears when a
 * geocoding miss silently degraded to `Number('')`, never a real site
 * location, so it's treated as "no coordinates" rather than a valid point.
 */
export function assertValidCoordinates(latitude: unknown, longitude: unknown): { lat: number; lon: number } {
  const lat = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
  const lon = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));
  if (Number.isNaN(lat) || lat < -90 || lat > 90 || Number.isNaN(lon) || lon < -180 || lon > 180) {
    throw new Error('Latitude and longitude are required (valid coordinates must be set before publishing).');
  }
  if (lat === 0 && lon === 0) {
    throw new Error('Latitude/longitude cannot both be 0 — this usually means geocoding failed; set the correct coordinates before publishing.');
  }
  return { lat, lon };
}

/** Editor rows (with client-side ids) from stored rows or a jsonb payload. */
export function toLinkEntries(
  links: { url: string; link_type: string; comment?: string | null }[]
): LinkEntry[] {
  return links.map((l) => ({
    id: crypto.randomUUID(),
    url: l.url,
    link_type: l.link_type,
    comment: l.comment ?? '',
  }));
}

export function toCelebrationEntries(
  celebrations: { date_label: string; description: string }[]
): CelebrationEntry[] {
  return celebrations.map((c) => ({
    id: crypto.randomUUID(),
    date_label: c.date_label,
    description: c.description,
  }));
}

// Loose input shape accepted by toSiteFormValues: covers typed import results
// (ImportedSite), full Site objects, and raw pending_submissions jsonb payloads —
// they share these field names.
type SiteLike = {
  name?: unknown;
  native_name?: unknown;
  country?: unknown;
  region?: unknown;
  municipality?: unknown;
  short_description?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  google_maps_url?: unknown;
  interest?: unknown;
  type?: unknown;
  tag_ids?: unknown;
};

/** SiteFormValues (all-string form state) from any site-shaped record. */
export function toSiteFormValues(r: SiteLike): SiteFormValues {
  const str = (v: unknown) => (v == null ? '' : String(v));
  return {
    name: str(r.name),
    native_name: str(r.native_name),
    country: str(r.country),
    region: str(r.region),
    municipality: str(r.municipality),
    short_description: str(r.short_description),
    latitude: str(r.latitude),
    longitude: str(r.longitude),
    google_maps_url: str(r.google_maps_url),
    interest: str(r.interest),
    type: str(r.type),
    image_url: '',
    tag_ids: Array.isArray(r.tag_ids) ? (r.tag_ids as string[]) : [],
  };
}

/** site_links insert/API rows from editor state — drops rows with no URL. */
export function linksToPayload(links: LinkEntry[]) {
  return links
    .filter((l) => l.url.trim())
    .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || null }));
}

/** site_celebrations insert/API rows from editor state — drops fully empty rows. */
export function celebrationsToPayload(celebrations: CelebrationEntry[]) {
  return celebrations
    .filter((c) => c.date_label.trim() || c.description.trim())
    .map((c, i) => ({
      date_label: c.date_label.trim(),
      description: c.description.trim(),
      display_order: i,
    }));
}

export interface CreateSiteOptions {
  id: string;
  values: SiteFormValues;
  links: LinkEntry[];
  celebrations: CelebrationEntry[];
  images: ImageEntry[];
  createdBy: string | null;
  hasNoImage?: boolean;
}

/**
 * Creates a new site row plus all its relations (tags, links, celebrations,
 * images) and syncs location tags. Shared by the admin bulk-import publish
 * flow (ContributeClient) and the admin approvals flow (AdminClient), which
 * collect identical editor state. Throws on the first failed insert.
 *
 * The caller is responsible for computing a unique site id and any
 * pre-insert validation/duplicate checks.
 */
export async function createSiteWithRelations(
  supabase: SupabaseClient,
  { id, values, links, celebrations, images, createdBy, hasNoImage = false }: CreateSiteOptions
): Promise<void> {
  const { lat, lon } = assertValidCoordinates(values.latitude, values.longitude);

  const { error: siteError } = await supabase.from('sites').insert({
    id,
    type: values.type || null,
    name: values.name.trim(),
    native_name: values.native_name.trim() || null,
    country: values.country.toUpperCase().trim() || null,
    region: values.region.trim() || null,
    municipality: values.municipality.trim() || null,
    short_description: values.short_description.trim(),
    latitude: lat,
    longitude: lon,
    google_maps_url: values.google_maps_url.trim(),
    interest: values.interest || null,
    featured: false,
    has_no_image: hasNoImage,
    created_by: createdBy,
    updated_at: new Date().toISOString(),
  });
  if (siteError) throw new Error(siteError.message);

  if (values.tag_ids.length > 0) {
    const { error } = await supabase.from('site_tag_assignments').insert(
      values.tag_ids.map((tag_id) => ({ site_id: id, tag_id }))
    );
    if (error) throw new Error(error.message);
  }

  const linkRows = linksToPayload(links);
  if (linkRows.length > 0) {
    const { error } = await supabase.from('site_links').insert(
      linkRows.map((l) => ({ site_id: id, ...l }))
    );
    if (error) throw new Error(error.message);
  }

  const celebrationRows = celebrationsToPayload(celebrations);
  if (celebrationRows.length > 0) {
    const { error } = await supabase.from('site_celebrations').insert(
      celebrationRows.map((c) => ({ site_id: id, ...c }))
    );
    if (error) throw new Error(error.message);
  }

  const validImages = images.filter((img) => !img.removed && img.finalUrl);
  if (validImages.length > 0) {
    const { error } = await supabase.from('site_images').insert(
      validImages.map((img, i) => ({
        site_id: id,
        url: img.finalUrl!,
        caption: img.caption || null,
        attribution: img.attribution || null,
        storage_type: img.storage_type || 'local',
        display_order: i,
      }))
    );
    if (error) throw new Error(error.message);
  }

  await syncLocationTags(
    supabase,
    id,
    values.country.toUpperCase().trim() || null,
    values.region.trim() || null,
    values.municipality.trim() || null
  );
}
