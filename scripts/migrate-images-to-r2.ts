import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = false;

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Initialize R2 S3 client (inline, don't import from lib/r2.ts)
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketEnv = process.env.R2_BUCKET_NAME;
const r2PublicUrlEnv = process.env.R2_PUBLIC_URL;

if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketEnv || !r2PublicUrlEnv) {
  throw new Error('Missing R2 environment variables');
}

// Narrow types to non-nullable strings
const validatedBucket = r2BucketEnv as string;
const validatedPublicUrl = r2PublicUrlEnv as string;

const s3Client = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
});

// Content type detection
function detectContentType(url: string, headers?: Headers): string {
  if (headers) {
    const contentType = headers.get('content-type');
    if (contentType) return contentType;
  }

  const ext = url.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };

  return contentTypes[ext || ''] || 'application/octet-stream';
}

// Extract storage path from Supabase URL
function extractStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/site-images\/(.+)$/);
  return match ? match[1] : null;
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extract R2 key from public URL
function extractR2Key(url: string): string {
  return url.slice(validatedPublicUrl.length + 1); // +1 for the /
}

async function main() {
  console.log(DRY_RUN ? '[DRY RUN] Starting image migration...' : 'Starting image migration...\n');

  // ============================================================================
  // PHASE 1: Supabase → R2 migration with canonical naming
  // ============================================================================
  console.log('='.repeat(50));
  console.log('PHASE 1: Supabase → R2 Migration');
  console.log('='.repeat(50));
  console.log('Gathering URLs to migrate...\n');

  const { data: siteImages, error: siteImagesError } = await supabase
    .from('site_images')
    .select('id, site_id, url, storage_type, display_order')
    .like('url', '%.supabase.co/storage/%');

  if (siteImagesError) {
    throw new Error(`Failed to fetch site_images: ${siteImagesError.message}`);
  }

  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('id, image_url')
    .like('image_url', '%.supabase.co/storage/%');

  if (tagsError) {
    throw new Error(`Failed to fetch tags: ${tagsError.message}`);
  }

  // Filter out external storage types
  const siteImagesToMigrate = (siteImages || []).filter(
    (img) => !img.storage_type || img.storage_type === 'local'
  );
  const tagsToMigrate = (tags || []).filter((tag) => tag.image_url);

  console.log(
    `Found ${siteImagesToMigrate.length} site images and ${tagsToMigrate.length} tag images to migrate\n`
  );

  let phase1Migrated = 0;
  let phase1Skipped = 0;
  let phase1Failed = 0;
  const failedUrls: Array<{ url: string; error: string }> = [];

  // Process site images with canonical naming
  for (let i = 0; i < siteImagesToMigrate.length; i++) {
    const siteImage = siteImagesToMigrate[i];
    const path = extractStoragePath(siteImage.url);

    if (!path) {
      console.log(
        `[${i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Skipped ${siteImage.url} (invalid path)`
      );
      phase1Skipped++;
      continue;
    }

    try {
      // Download the image
      const response = await fetch(siteImage.url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const contentType = detectContentType(siteImage.url, response.headers);
      const buffer = await response.arrayBuffer();

      // Upload to R2 with CANONICAL key format
      const canonicalKey = `sites/${siteImage.site_id}/${String(siteImage.display_order + 1).padStart(3, '0')}.jpg`;
      const uploadCommand = new PutObjectCommand({
        Bucket: validatedBucket,
        Key: canonicalKey,
        Body: Buffer.from(buffer),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await s3Client.send(uploadCommand);

      // Construct new URL
      const newUrl = `${validatedPublicUrl}/${canonicalKey}`;

      // Update database if not dry run
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('site_images')
          .update({ url: newUrl })
          .eq('id', siteImage.id);

        if (updateError) {
          console.log(
            `[${i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] ✓ Uploaded ${canonicalKey} but DB update failed: ${updateError.message}`
          );
          failedUrls.push({
            url: siteImage.url,
            error: `Image uploaded but DB update failed: ${updateError.message}`,
          });
          phase1Failed++;
        } else {
          console.log(
            `[${i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Migrated ${canonicalKey}`
          );
          phase1Migrated++;
        }
      } else {
        console.log(
          `[DRY RUN] [${i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Would migrate ${canonicalKey}`
        );
        phase1Migrated++;
      }

      await sleep(50);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `[${i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Failed to migrate site image: ${errorMsg}`
      );
      failedUrls.push({ url: siteImage.url, error: errorMsg });
      phase1Failed++;
    }
  }

  // Process tag images with canonical naming
  const startIndex = siteImagesToMigrate.length;
  for (let i = 0; i < tagsToMigrate.length; i++) {
    const tag = tagsToMigrate[i];
    const path = extractStoragePath(tag.image_url);

    if (!path) {
      console.log(
        `[${startIndex + i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Skipped ${tag.image_url} (invalid path)`
      );
      phase1Skipped++;
      continue;
    }

    try {
      // Download the image
      const response = await fetch(tag.image_url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const contentType = detectContentType(tag.image_url, response.headers);
      const buffer = await response.arrayBuffer();

      // Upload to R2 with canonical tag naming
      const canonicalKey = `tags/${tag.id}/hero.jpg`;
      const uploadCommand = new PutObjectCommand({
        Bucket: validatedBucket,
        Key: canonicalKey,
        Body: Buffer.from(buffer),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await s3Client.send(uploadCommand);

      // Construct new URL
      const newUrl = `${validatedPublicUrl}/${canonicalKey}`;

      // Update database if not dry run
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('tags')
          .update({ image_url: newUrl })
          .eq('id', tag.id);

        if (updateError) {
          console.log(
            `[${startIndex + i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] ✓ Uploaded ${canonicalKey} but DB update failed: ${updateError.message}`
          );
          failedUrls.push({
            url: tag.image_url,
            error: `Image uploaded but DB update failed: ${updateError.message}`,
          });
          phase1Failed++;
        } else {
          console.log(
            `[${startIndex + i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Migrated ${canonicalKey}`
          );
          phase1Migrated++;
        }
      } else {
        console.log(
          `[DRY RUN] [${startIndex + i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Would migrate ${canonicalKey}`
        );
        phase1Migrated++;
      }

      await sleep(50);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `[${startIndex + i + 1}/${siteImagesToMigrate.length + tagsToMigrate.length}] Failed to migrate tag image: ${errorMsg}`
      );
      failedUrls.push({ url: tag.image_url, error: errorMsg });
      phase1Failed++;
    }
  }

  // ============================================================================
  // PHASE 2: Rename existing R2 images to canonical format
  // ============================================================================
  console.log('\n' + '='.repeat(50));
  console.log('PHASE 2: Rename R2 Images to Canonical Format');
  console.log('='.repeat(50));
  console.log('Gathering R2 images for renaming...\n');

  const { data: allSiteImages, error: allSiteImagesError } = await supabase
    .from('site_images')
    .select('id, site_id, url, display_order')
    .filter('url', 'like', `${validatedPublicUrl!}%`);

  if (allSiteImagesError) {
    throw new Error(`Failed to fetch all site_images: ${allSiteImagesError.message}`);
  }

  const { data: allTags, error: allTagsError } = await supabase
    .from('tags')
    .select('id, image_url')
    .filter('image_url', 'like', `${validatedPublicUrl}%`);

  if (allTagsError) {
    throw new Error(`Failed to fetch all tags: ${allTagsError.message}`);
  }

  let phase2Renamed = 0;
  let phase2AlreadyCanonical = 0;
  let phase2Failed = 0;

  // Process site images
  const siteImagesOnR2 = (allSiteImages || []).filter((img) => img.url.startsWith(validatedPublicUrl));

  // Group by site_id
  const bySiteId: Record<string, typeof siteImagesOnR2> = {};
  for (const img of siteImagesOnR2) {
    if (!bySiteId[img.site_id]) {
      bySiteId[img.site_id] = [];
    }
    bySiteId[img.site_id].push(img);
  }

  // Sort each site's images by display_order
  for (const siteId in bySiteId) {
    bySiteId[siteId].sort((a, b) => a.display_order - b.display_order);
  }

  const totalSiteImages = siteImagesOnR2.length;
  let siteImageIndex = 0;

  // Process each site's images
  for (const siteId in bySiteId) {
    const images = bySiteId[siteId];

    for (const siteImage of images) {
      siteImageIndex++;
      const currentUrl = siteImage.url;
      const canonicalKey = `sites/${siteId}/${String(siteImage.display_order + 1).padStart(3, '0')}.jpg`;
      const canonicalUrl = `${validatedPublicUrl}/${canonicalKey}`;

      // Skip if already canonical
      if (currentUrl === canonicalUrl) {
        console.log(`[${siteImageIndex}/${totalSiteImages}] Already canonical: ${canonicalKey}`);
        phase2AlreadyCanonical++;
        continue;
      }

      try {
        const oldKey = extractR2Key(currentUrl);

        // Download from old key
        const downloadCommand = new GetObjectCommand({
          Bucket: validatedBucket,
          Key: oldKey,
        });

        const response = await s3Client.send(downloadCommand);
        const bodyBuffer = await (response.Body as any).transformToByteArray();
        const contentType = response.ContentType || 'image/jpeg';

        // Upload to canonical key
        const uploadCommand = new PutObjectCommand({
          Bucket: validatedBucket,
          Key: canonicalKey,
          Body: bodyBuffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await s3Client.send(uploadCommand);

        // Update DB if not dry run
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('site_images')
            .update({ url: canonicalUrl })
            .eq('id', siteImage.id);

          if (updateError) {
            console.log(
              `[${siteImageIndex}/${totalSiteImages}] ✓ Uploaded ${oldKey} → ${canonicalKey} but DB update failed: ${updateError.message}`
            );
            phase2Failed++;
            await sleep(50);
            continue;
          }

          // Delete old key only after DB update succeeds
          const deleteCommand = new DeleteObjectCommand({
            Bucket: validatedBucket,
            Key: oldKey,
          });

          await s3Client.send(deleteCommand);
        } else {
          console.log(
            `[DRY RUN] [Rename] [${siteImageIndex}/${totalSiteImages}] ${oldKey} → ${canonicalKey}`
          );
          phase2Renamed++;
          await sleep(50);
          continue;
        }

        console.log(
          `[Rename] [${siteImageIndex}/${totalSiteImages}] ${oldKey} → ${canonicalKey}`
        );
        phase2Renamed++;
        await sleep(50);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(
          `[${siteImageIndex}/${totalSiteImages}] Failed to rename site image: ${errorMsg}`
        );
        phase2Failed++;
      }
    }
  }

  // Process tag images
  const tagsOnR2 = (allTags || []).filter((tag) => tag.image_url && tag.image_url.startsWith(validatedPublicUrl));
  const totalTagImages = tagsOnR2.length;

  for (let i = 0; i < tagsOnR2.length; i++) {
    const tag = tagsOnR2[i];
    const currentUrl = tag.image_url;
    const canonicalKey = `tags/${tag.id}/hero.jpg`;
    const canonicalUrl = `${validatedPublicUrl}/${canonicalKey}`;

    // Skip if already canonical
    if (currentUrl === canonicalUrl) {
      console.log(
        `[${siteImageIndex + i + 1}/${totalSiteImages + totalTagImages}] Already canonical: ${canonicalKey}`
      );
      phase2AlreadyCanonical++;
      continue;
    }

    try {
      const oldKey = extractR2Key(currentUrl);

      // Download from old key
      const downloadCommand = new GetObjectCommand({
        Bucket: validatedBucket,
        Key: oldKey,
      });

      const response = await s3Client.send(downloadCommand);
      const bodyBuffer = await (response.Body as any).transformToByteArray();
      const contentType = response.ContentType || 'image/jpeg';

      // Upload to canonical key
      const uploadCommand = new PutObjectCommand({
        Bucket: validatedBucket,
        Key: canonicalKey,
        Body: bodyBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      });

      await s3Client.send(uploadCommand);

      // Update DB if not dry run
      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('tags')
          .update({ image_url: canonicalUrl })
          .eq('id', tag.id);

        if (updateError) {
          console.log(
            `[${siteImageIndex + i + 1}/${totalSiteImages + totalTagImages}] ✓ Uploaded ${oldKey} → ${canonicalKey} but DB update failed: ${updateError.message}`
          );
          phase2Failed++;
          await sleep(50);
          continue;
        }

        // Delete old key only after DB update succeeds
        const deleteCommand = new DeleteObjectCommand({
          Bucket: validatedBucket,
          Key: oldKey,
        });

        await s3Client.send(deleteCommand);
      } else {
        console.log(
          `[DRY RUN] [Rename] [${siteImageIndex + i + 1}/${totalSiteImages + totalTagImages}] ${oldKey} → ${canonicalKey}`
        );
        phase2Renamed++;
        await sleep(50);
        continue;
      }

      console.log(
        `[Rename] [${siteImageIndex + i + 1}/${totalSiteImages + totalTagImages}] ${oldKey} → ${canonicalKey}`
      );
      phase2Renamed++;
      await sleep(50);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `[${siteImageIndex + i + 1}/${totalSiteImages + totalTagImages}] Failed to rename tag image: ${errorMsg}`
      );
      phase2Failed++;
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary');
  console.log('='.repeat(50));

  console.log('\nPHASE 1 (Supabase → R2):');
  console.log(`  Migrated: ${phase1Migrated}`);
  console.log(`  Skipped: ${phase1Skipped}`);
  console.log(`  Failed: ${phase1Failed}`);

  console.log('\nPHASE 2 (Rename R2 Images):');
  console.log(`  Renamed: ${phase2Renamed}`);
  console.log(`  Already canonical: ${phase2AlreadyCanonical}`);
  console.log(`  Failed: ${phase2Failed}`);

  const totalImages = phase1Migrated + phase1Skipped + phase1Failed + phase2Renamed + phase2AlreadyCanonical + phase2Failed;
  console.log(`\nTotal images processed: ${totalImages}`);

  if (failedUrls.length > 0) {
    console.log('\nFailed URLs from Phase 1 (for manual review):');
    failedUrls.forEach(({ url, error }) => {
      console.log(`  - ${url}`);
      console.log(`    Error: ${error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN MODE] No database updates or R2 deletes were performed.');
    console.log('Set DRY_RUN = false to execute the migration.');
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
