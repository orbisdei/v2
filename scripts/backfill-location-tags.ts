/**
 * backfill-location-tags.ts
 *
 * Backfills country/region/municipality tags for all existing sites.
 * Mirrors the syncLocationTags() logic from lib/locationTags.ts.
 *
 * HOW TO RUN:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/backfill-location-tags.ts
 *
 * DRY RUN (logs what it would do, no writes):
 *   DRY_RUN=true npx tsx scripts/backfill-location-tags.ts
 *
 * IDEMPOTENT: Safe to re-run. Uses upsert for tags and upsert with
 * ignoreDuplicates for site_tag_assignments, so re-running is a no-op.
 *
 * REQUIRES:
 *   SUPABASE_URL — your project URL (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://vrnzirtvplbfxepgidhr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybnppcnR2cGxiZnhlcGdpZGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY5NjQ0NywiZXhwIjoyMDg5MjcyNDQ3fQ.f8bQ_2oTR4vqL7sJtxFcXvAxKVudEHKjDbPRpx_CNMA';
const DRY_RUN = process.env.DRY_RUN === 'false';
const BATCH_SIZE = 50;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Inline slug + country name helpers (mirrors lib/utils.ts + lib/countries.ts)
// ---------------------------------------------------------------------------

function slugify(name: string, maxLength = 80): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, maxLength);
}

const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BM','BN','BO','BR','BS','BT','BW','BY','BZ',
  'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','ER','ES','ET',
  'FI','FJ','FM','FR',
  'GA','GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW','GY',
  'HN','HR','HT','HU',
  'ID','IE','IL','IN','IQ','IR','IS','IT',
  'JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KR','KW','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MG','MK','ML','MM','MN','MR','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NE','NG','NI','NL','NO','NP','NR','NZ',
  'OM',
  'PA','PE','PG','PH','PK','PL','PS','PT','PW','PY',
  'QA',
  'RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR','SS','ST','SV','SY','SZ',
  'TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TZ',
  'UA','UG','US','UY','UZ',
  'VA','VC','VE','VN','VU',
  'WS',
  'YE',
  'ZA','ZM','ZW',
];

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRY_NAMES: Record<string, string> = {};
for (const code of COUNTRY_CODES) {
  COUNTRY_NAMES[code] = displayNames.of(code) ?? code;
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Site {
  id: string;
  country: string;
  region: string | null;
  municipality: string | null;
}

interface TagRow {
  id: string;
  name: string;
  type: string;
  country_code: string;
  parent_tag_id?: string | null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (DRY_RUN) console.log('[DRY RUN] No writes will be made.\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Fetch all sites with a country set
  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, country, region, municipality')
    .not('country', 'is', null);

  if (error) {
    console.error('Failed to fetch sites:', error.message);
    process.exit(1);
  }

  const total = sites.length;
  console.log(`Fetched ${total} sites with a country set.\n`);

  let countryTagsCreated = 0;
  let regionTagsCreated = 0;
  let municipalityTagsCreated = 0;
  let sitesLinked = 0;

  // Process in batches
  for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
    const batch: Site[] = sites.slice(batchStart, batchStart + BATCH_SIZE);

    // Collect all tags and assignments for this batch
    const allTagsToUpsert: TagRow[] = [];
    const allAssignments: { site_id: string; tag_id: string }[] = [];

    for (let i = 0; i < batch.length; i++) {
      const site = batch[i];
      const globalIndex = batchStart + i + 1;
      console.log(`Processing site ${globalIndex}/${total}: ${site.id}`);

      const cc = site.country.toLowerCase();
      const countryTagId = `country-${cc}`;

      const tagsForSite: TagRow[] = [
        {
          id: countryTagId,
          name: getCountryName(site.country),
          type: 'country',
          country_code: site.country.toUpperCase(),
        },
      ];

      const desiredTagIds: string[] = [countryTagId];

      if (site.region) {
        const regionTagId = `region-${slugify(site.region)}-${cc}`;
        desiredTagIds.push(regionTagId);
        tagsForSite.push({
          id: regionTagId,
          name: site.region,
          type: 'region',
          country_code: site.country.toUpperCase(),
          parent_tag_id: countryTagId,
        });
      }

      if (site.municipality) {
        const regionTagId = site.region
          ? `region-${slugify(site.region)}-${cc}`
          : null;
        const municipalityTagId = `municipality-${slugify(site.municipality)}-${cc}`;
        desiredTagIds.push(municipalityTagId);
        tagsForSite.push({
          id: municipalityTagId,
          name: site.municipality,
          type: 'municipality',
          country_code: site.country.toUpperCase(),
          parent_tag_id: regionTagId ?? countryTagId,
        });
      }

      // Accumulate (deduplicate tags by id across batch)
      for (const tag of tagsForSite) {
        if (!allTagsToUpsert.find((t) => t.id === tag.id)) {
          allTagsToUpsert.push(tag);
        }
      }
      for (const tagId of desiredTagIds) {
        allAssignments.push({ site_id: site.id, tag_id: tagId });
      }

      // Count for summary
      countryTagsCreated += 1; // we'll deduplicate in summary via set below
      if (site.region) regionTagsCreated += 1;
      if (site.municipality) municipalityTagsCreated += 1;
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY RUN] Would upsert ${allTagsToUpsert.length} tags and ${allAssignments.length} assignments.`
      );
      continue;
    }

    // Upsert tags
    const { error: tagsError } = await supabase
      .from('tags')
      .upsert(allTagsToUpsert, { onConflict: 'id', ignoreDuplicates: false });

    if (tagsError) {
      console.error(`  ERROR upserting tags for batch starting at ${batchStart}:`, tagsError.message);
      continue;
    }

    // Upsert site_tag_assignments (ignore conflicts on duplicate site_id+tag_id)
    const { error: assignError } = await supabase
      .from('site_tag_assignments')
      .upsert(allAssignments, { onConflict: 'site_id,tag_id', ignoreDuplicates: true });

    if (assignError) {
      console.error(`  ERROR upserting assignments for batch starting at ${batchStart}:`, assignError.message);
      continue;
    }

    sitesLinked += batch.length;
    console.log(
      `  Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: upserted ${allTagsToUpsert.length} tags, ${allAssignments.length} assignments.`
    );
  }

  // Deduplicate counts (country tags are per unique country, not per site)
  const uniqueCountryTags = new Set(
    sites.map((s: Site) => `country-${s.country.toLowerCase()}`)
  ).size;
  const uniqueRegionTags = new Set(
    sites
      .filter((s: Site) => s.region)
      .map((s: Site) => `region-${slugify(s.region!)}-${s.country.toLowerCase()}`)
  ).size;
  const uniqueMunicipalityTags = new Set(
    sites
      .filter((s: Site) => s.municipality)
      .map((s: Site) => `municipality-${slugify(s.municipality!)}-${s.country.toLowerCase()}`)
  ).size;

  console.log('\n--- Summary ---');
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create/update:`);
    console.log(`  ${uniqueCountryTags} unique country tags`);
    console.log(`  ${uniqueRegionTags} unique region tags`);
    console.log(`  ${uniqueMunicipalityTags} unique municipality tags`);
    console.log(`  ${total} sites processed`);
  } else {
    console.log(`Created/updated ${uniqueCountryTags} country tags, ${uniqueRegionTags} region tags, ${uniqueMunicipalityTags} municipality tags.`);
    console.log(`Linked ${sitesLinked} sites.`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
