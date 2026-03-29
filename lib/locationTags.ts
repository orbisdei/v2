import { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from '@/lib/utils';
import { getCountryName } from '@/lib/countries';

/**
 * Syncs location-based tags (country, region, municipality) for a site.
 * Upserts the tag rows, then diffs site_tag_assignments to match.
 */
export async function syncLocationTags(
  supabase: SupabaseClient,
  siteId: string,
  country: string | null,
  region: string | null,
  municipality: string | null
): Promise<void> {
  const locationTypes = ['country', 'region', 'municipality'];

  // 1. If no country, remove all location tags and return
  if (!country) {
    const { data: existing } = await supabase
      .from('site_tag_assignments')
      .select('tag_id, tags!inner(type)')
      .eq('site_id', siteId)
      .in('tags.type', locationTypes);

    if (existing && existing.length > 0) {
      const idsToRemove = existing.map((r: { tag_id: string }) => r.tag_id);
      await supabase
        .from('site_tag_assignments')
        .delete()
        .eq('site_id', siteId)
        .in('tag_id', idsToRemove);
    }
    return;
  }

  // 2. Derive tag IDs
  const cc = country.toLowerCase();
  const countryTagId = `country-${cc}`;

  const desiredTagIds: string[] = [countryTagId];

  let regionTagId: string | null = null;
  if (region) {
    regionTagId = `region-${slugify(region)}-${cc}`;
    desiredTagIds.push(regionTagId);
  }

  let municipalityTagId: string | null = null;
  if (municipality) {
    municipalityTagId = `municipality-${slugify(municipality)}-${cc}`;
    desiredTagIds.push(municipalityTagId);
  }

  // 3. Upsert tags
  const tagsToUpsert: {
    id: string;
    name: string;
    type: string;
    country_code: string;
    parent_tag_id?: string | null;
  }[] = [
    {
      id: countryTagId,
      name: getCountryName(country),
      type: 'country',
      country_code: country.toUpperCase(),
    },
  ];

  if (regionTagId && region) {
    tagsToUpsert.push({
      id: regionTagId,
      name: region,
      type: 'region',
      country_code: country.toUpperCase(),
      parent_tag_id: countryTagId,
    });
  }

  if (municipalityTagId && municipality) {
    tagsToUpsert.push({
      id: municipalityTagId,
      name: municipality,
      type: 'municipality',
      country_code: country.toUpperCase(),
      parent_tag_id: regionTagId ?? countryTagId,
    });
  }

  await supabase
    .from('tags')
    .upsert(tagsToUpsert, { onConflict: 'id', ignoreDuplicates: false });

  // 4. Fetch existing location tag assignments for this site
  const { data: existing } = await supabase
    .from('site_tag_assignments')
    .select('tag_id, tags!inner(type)')
    .eq('site_id', siteId)
    .in('tags.type', locationTypes);

  const existingTagIds = new Set(
    (existing ?? []).map((r: { tag_id: string }) => r.tag_id)
  );
  const desiredSet = new Set(desiredTagIds);

  // 5. Compute diff
  const toRemove = [...existingTagIds].filter((id) => !desiredSet.has(id));
  const toAdd = desiredTagIds.filter((id) => !existingTagIds.has(id));

  // 6. Delete removed assignments
  if (toRemove.length > 0) {
    await supabase
      .from('site_tag_assignments')
      .delete()
      .eq('site_id', siteId)
      .in('tag_id', toRemove);
  }

  // 7. Insert new assignments
  if (toAdd.length > 0) {
    await supabase
      .from('site_tag_assignments')
      .insert(toAdd.map((tag_id) => ({ site_id: siteId, tag_id })));
  }
}
