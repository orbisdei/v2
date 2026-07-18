import { SupabaseClient } from '@supabase/supabase-js';
import { syncLocationTags } from '@/lib/locationTags';
import type { LinkEntry, CelebrationEntry } from '@/lib/types';
import type { SiteFormValues, ImageEntry } from '@/components/admin/SiteForm';

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
  const { error: siteError } = await supabase.from('sites').insert({
    id,
    name: values.name.trim(),
    native_name: values.native_name.trim() || null,
    country: values.country.toUpperCase().trim() || null,
    region: values.region.trim() || null,
    municipality: values.municipality.trim() || null,
    short_description: values.short_description.trim(),
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
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
