# Location Tags: Enhancement Prompts

## Overview

These four enhancements build on the location auto-tags system already in place. Run them in order.

1. **Nominatim auto-fill** — auto-populate country/region/municipality from lat/lng on the site form
2. **Region backfill** — script to populate region for existing sites in select countries via Nominatim
3. **Tag page hierarchy** — show child regions/municipalities on country and region tag pages
4. **Orphan cleanup** — script to delete location tags with zero associated sites

---

## Prompt 1: Nominatim Auto-Fill on SiteForm

**What this does:** When a user enters or changes latitude/longitude on any site form, debounce for 1.5 seconds then call Nominatim reverse geocoding. Auto-fill country, region, and municipality from the response — but only if those fields are currently empty (don't overwrite manual entries). Show a small loading indicator near the coordinates.

```
Read CLAUDE.md for full project context. Read `components/admin/SiteForm.tsx` carefully — this is the only file you'll modify.

## Add Nominatim reverse geocoding auto-fill to SiteForm

When the user enters valid latitude AND longitude values, debounce for 1500ms, then call the Nominatim API to auto-fill country, region, and municipality. This helps users avoid manual entry while still allowing overrides.

### Implementation details:

1. Add a new state variable inside SiteForm:
   ```ts
   const [geocoding, setGeocoding] = useState(false);
   ```

2. Add a `useEffect` that watches `values.latitude` and `values.longitude`. When both are valid numbers (latitude between -90 and 90, longitude between -180 and 180), set a 1500ms debounce timer, then call:
   ```
   https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en
   ```
   
   Important: Set the `User-Agent` header to `OrbissDei/1.0 (orbisdei.org)` — Nominatim requires a meaningful User-Agent and blocks generic ones.

3. From the response JSON, extract:
   - `address.country_code` → uppercase → `country` (e.g., "it" → "IT")
   - Region: Use the FIRST non-null value from this priority list: `address.state`, `address.province`, `address.region`, `address.county`. Different countries use different admin levels.
   - Municipality: Use the FIRST non-null value from: `address.city`, `address.town`, `address.village`, `address.municipality`, `address.hamlet`.

4. Auto-fill rules — ONLY fill a field if it is currently empty (empty string or undefined):
   ```ts
   if (!country) onChange('country', extractedCountry);
   if (!region) onChange('region', extractedRegion);
   if (!municipality) onChange('municipality', extractedMunicipality);
   ```
   
   This means if the user has already typed a country code manually, the geocoding result won't overwrite it. But if they clear the field and change coordinates, it will fill again.

5. Show a subtle loading indicator. Next to the latitude/longitude grid, when `geocoding` is true, show a small spinner and "Looking up location…" text:
   ```tsx
   {geocoding && (
     <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
       <Loader2 size={10} className="animate-spin" />
       Looking up location…
     </p>
   )}
   ```
   Place this right after the lat/lng grid div, before the Google Maps URL field.

6. Error handling: If the fetch fails or returns no results, just silently stop (set `geocoding` to false). Don't show an error — the user can always fill the fields manually.

7. Cleanup: Return a cleanup function from the useEffect that clears the debounce timer (using `clearTimeout`). This prevents stale requests when the user keeps typing.

8. Import `Loader2` from `lucide-react` if not already imported.

### Important constraints:
- Nominatim rate limit is 1 request per second. The 1500ms debounce handles this for single-user interaction.
- Do NOT call Nominatim if the component is `disabled`.
- Do NOT call Nominatim if BOTH lat and lng haven't changed (to avoid re-firing on unrelated re-renders). Track previous coordinates with a ref.
- The `User-Agent` header can't be set on client-side fetch in all browsers. If it fails, try without the header — Nominatim usually works from browsers.
- Wrap the entire geocoding logic in a try/catch so it never breaks the form.
```

---

## Prompt 2: Region Backfill Script

**What this does:** A standalone script that reverse-geocodes existing sites (for selected countries) to populate the `region` field, then re-syncs location tags.

```
Read CLAUDE.md for full project context. Read `lib/locationTags.ts` and `lib/countries.ts`.

Create `scripts/backfill-regions.ts` — a standalone Node.js script that:

### Purpose
For sites in specified countries that have coordinates but no `region` value, call Nominatim reverse geocoding to look up the region and save it. Then re-sync location tags so region tags get created.

### Configuration at the top of the file:

```ts
// Which countries to backfill — ISO alpha-2 codes
const TARGET_COUNTRIES = ['US', 'FR', 'IT', 'ES', 'DE', 'GB', 'IE', 'PL', 'PT', 'MX', 'BR'];

// Set to true to log without writing
const DRY_RUN = true;

// Nominatim rate limit: 1 request per second (be conservative)
const DELAY_MS = 1100;
```

### Logic:

1. Connect to Supabase using env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Print an error and exit if not set. Add a comment at the top showing how to run:
   ```
   // Usage:
   //   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars, then:
   //   npx tsx scripts/backfill-regions.ts
   //
   //   To actually write, change DRY_RUN to false at the top of this file.
   ```

2. Fetch sites: `SELECT id, country, region, latitude, longitude FROM sites WHERE country IN (${TARGET_COUNTRIES}) AND region IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL`

3. Log: "Found N sites without region in target countries"

4. For each site, with a `DELAY_MS` pause between calls:
   a. Call `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en` with header `User-Agent: OrbissDei/1.0 (orbisdei.org)`
   b. Extract region from response: first non-null of `address.state`, `address.province`, `address.region`, `address.county`
   c. If no region found, log a warning and skip
   d. If DRY_RUN, log: `[DRY RUN] Would set region="${region}" for site ${id}`
   e. If not DRY_RUN:
      - Update the site: `UPDATE sites SET region = $region WHERE id = $id`
      - Call syncLocationTags logic (inline it — don't import from lib since this is a standalone script):
        - Upsert country tag, region tag, municipality tag into `tags`
        - Sync `site_tag_assignments` for this site
      - Log: `Updated site ${id}: region="${region}"`
   f. Catch and log any errors per-site (don't stop the whole script)

5. At the end, log summary:
   ```
   Backfill complete:
   - Processed: N sites
   - Regions found: X
   - Regions not found: Y
   - Errors: Z
   ```

### Inline helpers needed:
Since this is a standalone script, inline these rather than importing from lib/:
- `slugify(text)` — lowercase, replace spaces with hyphens, remove non-alphanumeric except hyphens
- `getCountryName(code)` — use `new Intl.DisplayNames(['en'], { type: 'region' })` to look up the name
- Location tag upsert + site_tag_assignments sync (same logic as lib/locationTags.ts but using the Supabase client directly)

### Important:
- Respect Nominatim's rate limit (1 req/sec). The 1100ms delay is conservative.
- The script is idempotent — running it again skips sites that already have a region.
- Process sites sequentially, not in parallel, to respect rate limits.
- If a site already has a region (from a previous partial run), it won't be in the query results.
```

---

## Prompt 3: Tag Page Hierarchy

**What this does:** On a country tag page (e.g., `/tag/country-it`), show a "Regions" and/or "Municipalities" section with links to child tag pages. On a region tag page, show its municipalities.

```
Read CLAUDE.md for full project context. Read `app/tag/[slug]/page.tsx` and `app/tag/[slug]/TagPageClient.tsx`.

## Add child location tags section to tag pages

When viewing a location tag page (country or region), show its child tags as clickable links so users can drill down geographically.

### 1. Update `app/tag/[slug]/page.tsx` (server component)

After fetching the tag, if it's a location tag (`tag.type === 'country'` or `tag.type === 'region'`), fetch its child tags:

```ts
import { getChildTags } from '@/lib/data';

// ... inside the default export, after fetching tag, sites, allTags, creatorName:

const childTags = (tag.type === 'country' || tag.type === 'region')
  ? await getChildTags(tag.id)
  : [];
```

Pass `childTags` as a new prop to `TagPageClient`.

### 2. Add `getChildTags` to `lib/data.ts`

```ts
export async function getChildTags(parentTagId: string): Promise<Tag[]> {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from('tags')
    .select('*')
    .eq('parent_tag_id', parentTagId)
    .order('name');
  return data ?? [];
}
```

Also, for each child tag, we need to know how many sites it has. Add a count by querying `site_tag_assignments`:

```ts
export async function getChildTagsWithCounts(parentTagId: string): Promise<(Tag & { site_count: number })[]> {
  const supabase = createStaticClient();
  
  // Fetch child tags
  const { data: children } = await supabase
    .from('tags')
    .select('*')
    .eq('parent_tag_id', parentTagId)
    .order('name');
  
  if (!children || children.length === 0) return [];
  
  // Fetch counts for each child tag
  const childIds = children.map(c => c.id);
  const { data: counts } = await supabase
    .from('site_tag_assignments')
    .select('tag_id')
    .in('tag_id', childIds);
  
  const countMap = new Map<string, number>();
  for (const row of (counts ?? [])) {
    countMap.set(row.tag_id, (countMap.get(row.tag_id) ?? 0) + 1);
  }
  
  return children.map(c => ({
    ...c,
    site_count: countMap.get(c.id) ?? 0,
  }));
}
```

Use `getChildTagsWithCounts` instead of `getChildTags` in page.tsx.

### 3. Update `TagPageClient.tsx`

Add `childTags` to the props interface:

```ts
interface TagPageClientProps {
  tag: Tag;
  sites: Site[];
  pins: MapPin[];
  allTags: Tag[];
  creatorName: string | null;
  childTags: (Tag & { site_count: number })[];
}
```

In BOTH the mobile and desktop layouts, add a child tags section between the tag description and the results count. Only render it if `childTags.length > 0`.

For a **country** tag, the children are regions (and possibly municipalities if no region exists). Group them:
- If any children have `type === 'region'`, show a "Regions" header with those as pills
- If any children have `type === 'municipality'`, show a "Municipalities" header (or "Cities" for better readability) with those as pills

For a **region** tag, children are municipalities. Show a "Cities" header.

#### Desktop rendering (inside the left column, after tag description, before results count):

```tsx
{childTags.length > 0 && (
  <div className="mt-4 mb-2">
    {(() => {
      const regions = childTags.filter(t => t.type === 'region');
      const municipalities = childTags.filter(t => t.type === 'municipality');
      return (
        <>
          {regions.length > 0 && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Regions
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {regions.map(child => (
                  <Link
                    key={child.id}
                    href={`/tag/${child.id}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    {child.name}
                    <span className="ml-1 text-blue-400">({child.site_count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {municipalities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Cities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {municipalities.map(child => (
                  <Link
                    key={child.id}
                    href={`/tag/${child.id}`}
                    className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    {child.name}
                    <span className="ml-1 text-blue-400">({child.site_count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      );
    })()}
  </div>
)}
```

#### Mobile rendering (inside the sticky top section, after the tag description paragraph, before the results count bar):

Same content but with tighter spacing: use `px-[14px]` padding and slightly smaller gaps to match the mobile density.

```tsx
{childTags.length > 0 && (
  <div className="px-[14px] pt-[8px]">
    {/* Same content as desktop but with mobile-appropriate spacing */}
  </div>
)}
```

### 4. Also add breadcrumb navigation for location tag pages

For region and municipality tag pages, show a breadcrumb trail at the top so users can navigate up the hierarchy.

In `TagPageClient.tsx`, derive the breadcrumb from the tag's type and parent:

- For a **municipality** tag: show "Country > Region > Municipality" (or "Country > Municipality" if no region)
- For a **region** tag: show "Country > Region"
- For a **country** tag: no breadcrumb needed

To get the parent tag info, pass it from `page.tsx`. In the server component:

```ts
const parentTag = tag.parent_tag_id ? await getTagBySlug(tag.parent_tag_id) : null;
const grandparentTag = parentTag?.parent_tag_id ? await getTagBySlug(parentTag.parent_tag_id) : null;
```

Pass `parentTag` and `grandparentTag` as props. Then in TagPageClient, render above the tag name:

```tsx
{(parentTag || grandparentTag) && (
  <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
    {grandparentTag && (
      <>
        <Link href={`/tag/${grandparentTag.id}`} className="hover:text-navy-600">{grandparentTag.name}</Link>
        <ChevronRight size={10} />
      </>
    )}
    {parentTag && (
      <>
        <Link href={`/tag/${parentTag.id}`} className="hover:text-navy-600">{parentTag.name}</Link>
        <ChevronRight size={10} />
      </>
    )}
    <span className="text-gray-500">{tag.name}</span>
  </div>
)}
```

Place this right after the tag name `<h1>` in both mobile and desktop layouts. Import `ChevronRight` from lucide-react if not already imported (it likely already is).
```

---

## Prompt 4: Orphan Location Tag Cleanup Script

**What this does:** Deletes location tags that have zero sites associated with them. Safe to run periodically.

```
Read CLAUDE.md for full project context.

Create `scripts/cleanup-orphan-location-tags.ts` — a standalone Node.js script.

### Purpose
Delete location tags (type = 'country', 'region', or 'municipality') that have zero associated sites in `site_tag_assignments`. This cleans up tags created for sites that were later deleted or had their location changed.

### Configuration:

```ts
const DRY_RUN = true;
```

### Comments at the top:
```
// Cleanup orphan location tags — deletes location tags with zero associated sites.
//
// Usage:
//   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars, then:
//   npx tsx scripts/cleanup-orphan-location-tags.ts
//
//   To actually delete, change DRY_RUN to false.
//
// Safe to run periodically. Does NOT touch topic tags.
// Deletes in reverse hierarchy order (municipalities first, then regions, then countries)
// so parent_tag_id references aren't violated.
```

### Logic:

1. Connect to Supabase using env vars. Error and exit if not set.

2. Fetch all location tags:
   ```sql
   SELECT id, name, type, parent_tag_id FROM tags WHERE type IN ('country', 'region', 'municipality')
   ```

3. Fetch all site_tag_assignments for those tag IDs:
   ```sql
   SELECT tag_id FROM site_tag_assignments WHERE tag_id IN (${locationTagIds})
   ```

4. Build a set of tag_ids that have at least one assignment.

5. Identify orphans: location tags NOT in the set from step 4.

6. **Delete in reverse hierarchy order** to avoid FK constraint violations on `parent_tag_id`:
   - First: delete orphan municipality tags
   - Second: re-check region tags (a region might have become orphan after its municipalities were deleted — but actually, region orphan status is based on site_tag_assignments not child tags, so this order just avoids FK issues)
   - Third: delete orphan country tags
   
   Before deleting a tag, also check that no other tags reference it as `parent_tag_id`. If a country tag is orphaned (no direct site assignments) but has child region/municipality tags that DO have assignments, do NOT delete the country tag — it's still needed as a parent.

   ```ts
   // Build parent reference set
   const referencedAsParent = new Set(
     allLocationTags.filter(t => t.parent_tag_id).map(t => t.parent_tag_id)
   );
   
   // Only delete orphans that are not referenced as parents by non-orphan tags
   const safeToDelete = orphans.filter(t => {
     if (!referencedAsParent.has(t.id)) return true;
     // Check if any non-orphan tag references this one
     const referencedByNonOrphan = allLocationTags.some(
       other => other.parent_tag_id === t.id && !orphanIds.has(other.id)
     );
     return !referencedByNonOrphan;
   });
   ```

7. For each tag to delete:
   - If DRY_RUN: log `[DRY RUN] Would delete ${tag.type} tag: ${tag.name} (${tag.id})`
   - If not DRY_RUN:
     - Delete any remaining `site_tag_assignments` rows for this tag (should be 0, but be safe)
     - Delete the tag from `tags`
     - Log: `Deleted ${tag.type} tag: ${tag.name} (${tag.id})`

8. Summary:
   ```
   Orphan cleanup complete:
   - Location tags checked: N
   - Orphans found: X
   - Safe to delete: Y (Z skipped — still referenced as parent)
   - Deleted: Y (or "Would delete: Y" in dry run)
   ```

### Important:
- Never delete topic tags — only location tags.
- Never delete a location tag that is still referenced as `parent_tag_id` by a non-orphan tag.
- Idempotent — running multiple times is safe.
- Uses service role key for full access.
```

---

## Execution Order

1. **Prompt 1** (Nominatim auto-fill) — deploy immediately, no dependencies
2. **Prompt 2** (Region backfill) — run after deploying Prompt 1; takes a while due to rate limits
3. **Re-run the location tag backfill** (`npx tsx scripts/backfill-location-tags.ts`) after the region backfill to pick up the new region tags
4. **Prompt 3** (Tag page hierarchy) — deploy after regions exist in the database
5. **Prompt 4** (Orphan cleanup) — run anytime after everything else is stable

## Post-Implementation Notes

- The Nominatim auto-fill fires on every coordinate change. If the user pastes coordinates from the bulk import, it works seamlessly.
- The region backfill script can be re-run for additional countries later — just update `TARGET_COUNTRIES`.
- The orphan cleanup can be run periodically (monthly?) or triggered manually after large data changes.
- Tag page hierarchy has zero cost if there are no child tags — it just won't render the section.
