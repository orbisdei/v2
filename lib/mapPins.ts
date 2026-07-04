import type { MapPin, Site } from './types';

/**
 * Derive a MapPin from a summary Site row. Site.images are already sorted by
 * display_order in lib/data.ts, so the first image is the canonical thumbnail.
 * Deriving pins client-side avoids serializing the catalog twice (sites + pins)
 * in the RSC payload of pages that already ship the site list.
 */
export function siteToMapPin(site: Site): MapPin {
  return {
    id: site.id,
    name: site.name,
    latitude: site.latitude,
    longitude: site.longitude,
    short_description: site.short_description,
    interest: site.interest,
    thumbnail_url: site.images[0]?.url,
  };
}
