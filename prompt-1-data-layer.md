# Prompt 1: Attribution Data Layer + Types

## Context
The `site_images` table now has a new nullable `attribution` column (text). The SQL migration has already been run. This prompt wires the new column through the TypeScript types, data layer, form types, and all API routes that write `site_images`.

## Tasks

### 1. Update `lib/types.ts`
Add `attribution?: string` to the `SiteImage` interface, after the `caption` field.

### 2. Update `lib/data.ts` — `rowToSite`
In the `rowToSite` function, the `.map()` over `site_images` already extracts `url`, `caption`, `storage_type`, `display_order`. Add `attribution: img.attribution as string | undefined` to the mapped object.

### 3. Update `lib/data.ts` — `getHeroImageForLocationTag`
This function currently returns `{ imageUrl, siteName, siteId }`. Change it to also return `imageAttribution: string | null`. In the query's select, `site_images` already fetches `url, display_order` — add `attribution` to that select. When picking the sorted first image, grab `attribution` and return it alongside `imageUrl`.

The return type becomes:
```ts
{ imageUrl: string; siteName: string; siteId: string; imageAttribution: string | null } | null
```

### 4. Update `components/admin/SiteForm.tsx` — `ImageEntry` type
Add `attribution: string;` to the `ImageEntry` type (default empty string, same as `caption`).

### 5. Update `components/admin/SiteForm.tsx` — `buildImagesPayload`
In the `.map()` inside `buildImagesPayload`, add `attribution: img.attribution` to the returned object.

### 6. Update `components/admin/SiteForm.tsx` — image creation in `uploadFiles`
When creating a new `ImageEntry` in `uploadFiles` (the `updateImages((prev) => [...prev, { ... }])` call), add `attribution: ''` to the new entry object.

### 7. Update `app/site/[slug]/edit/EditSiteClient.tsx` — `initialImages` construction
In the `useState<ImageEntry[]>` that maps `site.images` to `ImageEntry[]`, add `attribution: img.attribution || ''` to the mapped object. Currently the map includes `caption: img.caption || ''` — add attribution right after that.

### 8. Update `app/api/publish-site-edit/route.ts` — image insert
The `ImageRow` type alias near the top of the POST handler currently has `{ url: string; caption?: string; storage_type?: string; display_order: number }`. Add `attribution?: string` to it.

In the `imageRows` mapping that builds insert data, add `attribution: img.attribution || null` alongside the existing `caption: img.caption || null`.

### 9. Update `app/admin/AdminClient.tsx` — pending submission approval
In the approval handler that inserts `site_images` for approved site submissions, the `.map()` over `p.images` currently includes `url, caption, storage_type, display_order`. Add `attribution: img.attribution || null` to the mapped insert object. Update the type assertion to include `attribution?: string`.

### 10. Update `app/admin/import/ImportClient.tsx` — `publishSite`
In the `publishSite` function, the `uploadedImages` mapping builds insert rows with `site_id, url, caption, storage_type, display_order`. Add `attribution: img.attribution || null` to the mapped object. This requires `ImageEntry` to have `attribution` which it will after step 4.

## Verification
After all changes:
```bash
# Check no TypeScript errors
npx tsc --noEmit

# Grep to confirm attribution flows through
grep -rn "attribution" lib/types.ts lib/data.ts components/admin/SiteForm.tsx app/api/publish-site-edit/route.ts app/admin/AdminClient.tsx app/admin/import/ImportClient.tsx app/site/[slug]/edit/EditSiteClient.tsx

# Check build compiles
npm run build
```
