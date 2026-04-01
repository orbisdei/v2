# Cloudflare R2 Image Storage Migration — Claude Code Prompts

Run these prompts sequentially in Claude Code. Commit between each prompt.
Deploy and test after Prompt 3 before running the migration script.

**Pre-requisites (do these before running any prompt):**
1. `npm install @aws-sdk/client-s3` (if not already installed from testing)
2. Add these env vars to `.env.local`:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME=orbis-dei-images`
   - `R2_PUBLIC_URL=https://images.orbisdei.org`
3. Add the same 5 env vars in Vercel dashboard (Settings > Environment Variables)

| Prompt | Creates | Modifies |
|--------|---------|----------|
| 1 | `lib/r2.ts` | `lib/storage.ts` |
| 2 | — | `app/api/upload-image/route.ts`, `app/api/upload-tag-image/route.ts` |
| 3 | — | `CLAUDE.md` |
| 4 | `scripts/migrate-images-to-r2.ts` | — |

---

## Prompt 1: R2 Client + Rewrite storage.ts

```
Rescan the codebase. Read these files before making changes:
- CLAUDE.md
- lib/storage.ts
- lib/r2.ts (confirm it does not exist yet)
- package.json (confirm @aws-sdk/client-s3 is installed)

This prompt creates the R2 client wrapper and rewrites lib/storage.ts to use Cloudflare R2 instead of Supabase Storage. Do NOT modify any API routes or other files.

### 1a. Create `lib/r2.ts`

Create a new file that initializes and exports a singleton S3 client for Cloudflare R2.

```ts
import { S3Client } from '@aws-sdk/client-s3';
```

Read these from `process.env`:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

Guard against missing vars, but allow them to be absent during Next.js build phase:
```ts
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (!isBuildPhase && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || ...)) {
  throw new Error('Missing R2 environment variables');
}
```

Client config:
- endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- region: `'auto'`
- forcePathStyle: `true`
- credentials from the env vars

Export three things:
- `r2Client` — the S3Client instance
- `R2_BUCKET` — the bucket name string
- `R2_PUBLIC_URL` — the public base URL string (e.g. `https://images.orbisdei.org`)

### 1b. Rewrite `lib/storage.ts`

Replace the entire file. The two functions change signatures — they no longer accept a `supabase: SupabaseClient` parameter.

**`uploadSiteImage(siteId: string, file: Buffer, fileName: string, contentType: string): Promise<string>`**
- Storage key: `sites/${siteId}/${Date.now()}-${fileName}`
- Use `PutObjectCommand` from `@aws-sdk/client-s3`
- Bucket: import `R2_BUCKET` from `./r2`
- Client: import `r2Client` from `./r2`
- Set `ContentType` to the passed contentType
- Set `CacheControl` to `'public, max-age=31536000, immutable'`
- On error, throw with the original error message
- Return: `${R2_PUBLIC_URL}/${key}` (import R2_PUBLIC_URL from ./r2)

**`uploadTagImage(tagId: string, file: Buffer, fileName: string, contentType: string): Promise<string>`**
- Extract extension: `fileName.split('.').pop() ?? 'jpg'`
- Storage key: `tags/${tagId}/hero.${ext}`
- Same PutObjectCommand pattern as above
- R2 overwrites existing keys by default, so no upsert flag needed
- Return: `${R2_PUBLIC_URL}/${key}`

Remove the `import type { SupabaseClient }` — it is no longer needed.

Do NOT change any other files. Do NOT touch API routes yet.

### Verify
```bash
npx tsc --noEmit
```
This WILL show type errors in the API routes because the function signatures changed. That is expected — Prompt 2 fixes them. Just confirm that `lib/storage.ts` and `lib/r2.ts` themselves compile cleanly.
```

---

## Prompt 2: Update API Routes

```
Rescan these files before making changes:
- lib/storage.ts (just rewritten — confirm new signatures have no supabase param)
- app/api/upload-image/route.ts
- app/api/upload-tag-image/route.ts

The storage functions were rewritten in the previous prompt. They no longer accept a
`supabase` parameter. Update both API routes to match.

### 2a. `app/api/upload-image/route.ts`

Find the call to `uploadSiteImage`. It currently looks like:
```ts
url = await uploadSiteImage(supabase, siteId, fileBuffer, sanitizedName, file.type);
```

Change it to:
```ts
url = await uploadSiteImage(siteId, fileBuffer, sanitizedName, file.type);
```

That is the ONLY change in this file. Keep all auth, role checking, file validation,
size limits, and sanitization exactly as they are. The Supabase client is still used
for auth — just not for the upload itself.

### 2b. `app/api/upload-tag-image/route.ts`

Same change. Find:
```ts
url = await uploadTagImage(supabase, tagId, fileBuffer, sanitizedName, file.type);
```

Change to:
```ts
url = await uploadTagImage(tagId, fileBuffer, sanitizedName, file.type);
```

Again, keep everything else identical.

### 2c. Search for any other callers

Search the entire codebase for any other imports of `uploadSiteImage` or `uploadTagImage`.
If found anywhere else, update those call sites too (remove the supabase argument).

Check:
- `components/admin/SiteForm.tsx` — this calls `/api/upload-image` via fetch, not the
  storage function directly, so it should NOT need changes. Verify this.
- `app/admin/AdminClient.tsx` — check if it imports from lib/storage
- Any other file that imports from `lib/storage`

### Verify
```bash
npx tsc --noEmit
```
This should now pass with zero errors. If there are errors, fix them — they will be
related to the removed supabase parameter.
```

---

## Prompt 3: Update CLAUDE.md

```
Read CLAUDE.md fully before making changes.

Update documentation to reflect the R2 migration:

### 3a. Project Structure comment

In the `lib/` section of the project structure, update the comment next to `storage.ts`:
- Old: `# ALL image uploads go here — single function, swap point for future migration`
- New: `# ALL image uploads go here — uses Cloudflare R2 via S3-compatible API`

Add `r2.ts` to the file listing:
- `r2.ts                      # Cloudflare R2 S3 client initialization`

### 3b. Add Image Storage section

Add a new subsection under the "Patterns" section (after "Data access" or "API route pattern")
called "Image storage". Content:

```
### Image storage
- Images are stored in Cloudflare R2 bucket `orbis-dei-images`, served via `images.orbisdei.org` (Cloudflare CDN)
- `lib/r2.ts` initializes the S3 client; `lib/storage.ts` has `uploadSiteImage` and `uploadTagImage`
- Upload functions do not require a Supabase client — they use the R2 S3 client directly
- API routes (`upload-image`, `upload-tag-image`) still use Supabase for auth/role checks, then call storage functions for the actual upload
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- Some older images may still reference Supabase Storage URLs (`*.supabase.co/storage/...`) until the migration script is run
```

### 3c. Remove outdated references

Search CLAUDE.md for any mentions of "Supabase Storage" in the context of image uploads
and update or remove them. Keep references to Supabase Storage that are about the
database itself (not image storage). If there's a mention of "future migration" related
to storage, remove or update it since the migration is now done.

Do NOT change any code files. Only CLAUDE.md.
```

---

## ⚠️ STOP HERE — Deploy and Test

Before running Prompt 4:

1. Commit and deploy: `deploy "migrate image uploads to Cloudflare R2"`
2. Test on the live site:
   - Upload a new site image via the contribute or edit form
   - Upload a new tag image via the tag edit form
   - Confirm both URLs point to `images.orbisdei.org`
   - Confirm images display correctly
3. Verify old Supabase Storage images still load (they should — we haven't touched them)

Only proceed to Prompt 4 once new uploads are confirmed working.

---

## Prompt 4: Migration Script for Existing Images

```
Create `scripts/migrate-images-to-r2.ts`.

This is a one-time script that downloads existing images from Supabase Storage and
re-uploads them to Cloudflare R2, then updates the database URLs.

Put `const DRY_RUN = true;` at the very top of the file (after imports), following the
project convention for scripts.

### Structure

```ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// ... rest of imports after dotenv loads
```

Import `@aws-sdk/client-s3` (PutObjectCommand), `@supabase/supabase-js` (createClient).

Initialize:
- Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- S3 client using the R2 env vars (same config as lib/r2.ts but inline — don't import
  from lib/r2 since this is a standalone script)

### Step 1: Gather URLs to migrate

Query `site_images` table: select `id, url, storage_type` where `url` contains
`.supabase.co/storage/` AND `storage_type != 'external'` (or storage_type is null/local).

Query `tags` table: select `id, image_url` where `image_url` contains `.supabase.co/storage/`.

Print summary: "Found X site images and Y tag images to migrate"

### Step 2: Process each image

For each URL:

a) Extract the storage path. The Supabase public URL format is:
   `https://<project>.supabase.co/storage/v1/object/public/site-images/<path>`
   Extract `<path>` — this becomes the R2 key.

b) Download the image from the Supabase public URL using `fetch()`.
   If download fails, log the error and continue to the next image.

c) Detect content type from the response headers or infer from file extension.

d) Upload to R2 using PutObjectCommand:
   - Key: the extracted path (same structure as Supabase)
   - Body: Buffer from the response
   - ContentType: detected content type
   - CacheControl: 'public, max-age=31536000, immutable'

e) Construct new URL: `${R2_PUBLIC_URL}/${path}`

f) If NOT DRY_RUN:
   - For site_images: update the row's `url` to the new R2 URL
   - For tags: update the row's `image_url` to the new R2 URL

g) Print progress: `[1/47] Migrated sites/it-rome-basilica/1234-photo.jpg`
   In dry run: `[DRY RUN] [1/47] Would migrate sites/it-rome-basilica/1234-photo.jpg`

h) Wait 50ms between uploads to avoid rate limiting

### Step 3: Summary

Print final counts:
- Total found
- Successfully migrated
- Skipped (already R2 or external)
- Failed (with list of failed URLs)

### Error handling
- Wrap each individual image in try/catch — never abort the whole run for one failure
- Log failed URLs with the error message for manual review
- If the R2 upload succeeds but the DB update fails, log that specifically (the image
  exists in R2 but the URL wasn't updated — can be fixed manually)

### Important constraints
- Do NOT import from `lib/r2.ts` — this is a standalone script, inline the S3 client setup
- Load dotenv FIRST before any other imports that read process.env
- Use `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`) to match the project convention
- The script should be idempotent — running it twice should skip already-migrated images
  (they won't match the `.supabase.co/storage/` filter anymore)
```

---

## Post-Migration Checklist

After running the migration script with `DRY_RUN = false`:

1. Spot-check 5–10 site pages — do all images load?
2. Check tag pages with images — do hero banners and topic tag images load?
3. Check the admin import page — do uploaded images during import go to R2?
4. Verify OG images work (share a site link on social media or use a debugger tool)
5. Optional: keep the Supabase Storage bucket for a week as a safety net, then clean up
6. Delete `scripts/migrate-images-to-r2.ts` and the test scripts
7. Remove `@aws-sdk/client-s3` from devDependencies and add to regular dependencies
   (it's now used in production API routes, not just scripts)
