import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL_BASE } from './r2';

/**
 * Normalize a user-uploaded image before storing it as the R2 master:
 * - rotate() bakes in the EXIF orientation flag (sideways phone photos)
 * - cap the longest edge at 2560px (a 6MB camera photo becomes ~0.5MB;
 *   still larger than any display size — Cloudflare Transformations
 *   downscale from this master at the edge)
 * - re-encode as progressive JPEG; sharp drops EXIF (incl. GPS) by default
 * Throws on undecodable input — callers should treat that as a 400.
 */
export async function normalizeUploadedImage(file: Buffer): Promise<Buffer> {
  return sharp(file)
    .rotate()
    .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toBuffer();
}

/**
 * Pixel dimensions of an (already normalized) image buffer. Orientation is
 * baked in by normalizeUploadedImage's rotate(), so these are true display
 * dimensions. Throws if the header can't be read.
 */
export async function getImageDimensions(file: Buffer): Promise<{ width: number; height: number }> {
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) throw new Error('Could not read image dimensions');
  return { width, height };
}

// ---------------------------------------------------------------------------
// R2 delete safety guard
// Any key that does not start with one of these prefixes must never be deleted.
// If a new permanent prefix is added to the bucket, add it here too.
// ---------------------------------------------------------------------------
const ALLOWED_DELETE_PREFIXES = ['sites/', 'tags/'];

function assertSafeR2Key(key: string): void {
  const isSafe = ALLOWED_DELETE_PREFIXES.some((prefix) => key.startsWith(prefix));
  if (!isSafe) {
    throw new Error(
      `[R2 Safety] Refusing to delete key "${key}" — does not match allowed prefixes: ${ALLOWED_DELETE_PREFIXES.join(', ')}`,
    );
  }
}

// Tag hero key: versioned (timestamp) + dimension-encoded, mirroring
// uploadSiteImage's timestamped key. The versioned filename means replacing a
// tag image yields a NEW url — a guaranteed CDN/browser cache miss, so old
// bytes are never served for the new image (the old stable `hero.jpg` key +
// `immutable` cache made replacements stick for up to a year). The trailing
// `-{w}x{h}` lets the render layer (parseTagImageDims) reserve the image box
// up front with no CLS and no DB column — and it can't drift from the bytes
// because it's part of the same url. The master is always JPEG (normalized).
function tagImageKey(tagId: string, width: number, height: number): string {
  return `tags/${tagId}/${Date.now()}-${width}x${height}.jpg`;
}

export async function uploadTagImage(
  tagId: string,
  file: Buffer,
  width: number,
  height: number,
  contentType = 'image/jpeg',
): Promise<string> {
  const key = tagImageKey(tagId, width, height);

  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  } catch (error) {
    throw new Error(`Failed to upload tag image: ${error instanceof Error ? error.message : String(error)}`);
  }

  return `${R2_PUBLIC_URL_BASE}/${key}`;
}

export async function uploadSiteImage(
  siteId: string,
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const key = `sites/${siteId}/${Date.now()}-${fileName}`;

  try {
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      }),
    );
  } catch (error) {
    throw new Error(`Failed to upload site image: ${error instanceof Error ? error.message : String(error)}`);
  }

  return `${R2_PUBLIC_URL_BASE}/${key}`;
}

export function isR2Url(url: string): boolean {
  return url.startsWith(R2_PUBLIC_URL_BASE);
}

export async function renameSiteImage(
  oldUrl: string,
  siteId: string,
  displayOrder: number,
): Promise<string> {
  // Extract the old R2 key from the URL
  if (!oldUrl.startsWith(R2_PUBLIC_URL_BASE)) {
    throw new Error('URL is not an R2 URL');
  }

  const oldKey = oldUrl.slice(R2_PUBLIC_URL_BASE.length + 1); // +1 for the /
  const newKey = `sites/${siteId}/${String(displayOrder + 1).padStart(3, '0')}.jpg`;

  // If already canonical, return unchanged
  if (oldKey === newKey) {
    return oldUrl;
  }

  try {
    // Download the object from the old key
    const downloadCommand = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: oldKey,
    });

    const response = await r2Client.send(downloadCommand);
    const bodyBuffer = await (response.Body as any).transformToByteArray();
    const contentType = response.ContentType || 'image/jpeg';

    // Upload to the new key with the same metadata
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: newKey,
      Body: bodyBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await r2Client.send(uploadCommand);

    // Delete the old key
    assertSafeR2Key(oldKey);
    console.log(`[R2 delete] key="${oldKey}"`);
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: oldKey,
    });

    await r2Client.send(deleteCommand);

    return `${R2_PUBLIC_URL_BASE}/${newKey}`;
  } catch (error) {
    throw new Error(
      `Failed to rename site image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function renameTagImage(
  oldUrl: string,
  newTagId: string,
): Promise<string | null> {
  // Move a tag's R2 image under the new tag id on a slug rename. Derives the
  // key from the url (like renameSiteImage) and preserves the filename, so the
  // `-{w}x{h}` dimension suffix survives the move. Returns the new url, or null
  // if there's no R2 object to rename.
  if (!oldUrl.startsWith(R2_PUBLIC_URL_BASE)) return null;
  const oldKey = oldUrl.slice(R2_PUBLIC_URL_BASE.length + 1); // +1 for the /
  const fileName = oldKey.split('/').pop() ?? 'hero.jpg';
  const newKey = `tags/${newTagId}/${fileName}`;

  if (oldKey === newKey) return oldUrl;

  try {
    const downloadCommand = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: oldKey,
    });
    const response = await r2Client.send(downloadCommand);
    const bodyBuffer = await (response.Body as any).transformToByteArray();
    const contentType = response.ContentType || 'image/jpeg';

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: newKey,
        Body: bodyBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    assertSafeR2Key(oldKey);
    console.log(`[R2 delete] key="${oldKey}"`);
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: oldKey,
      }),
    );

    return `${R2_PUBLIC_URL_BASE}/${newKey}`;
  } catch (error: unknown) {
    // If the old key doesn't exist, there's nothing to rename — return null silently
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'NoSuchKey'
    ) {
      return null;
    }
    throw new Error(
      `Failed to rename tag image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function deleteSiteImage(url: string): Promise<void> {
  // If not an R2 URL, skip silently (external or old Supabase URL)
  if (!isR2Url(url)) {
    return;
  }

  try {
    const key = url.slice(R2_PUBLIC_URL_BASE.length + 1); // +1 for the /

    // Guard: reject keys that don't start with a known permanent prefix.
    // This catches URL-manipulation bugs where the DB contains a malformed R2
    // URL that would resolve to an unexpected key (e.g. a root-level object).
    assertSafeR2Key(key);
    console.log(`[R2 delete] key="${key}"`);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    await r2Client.send(deleteCommand);
  } catch (error) {
    throw new Error(
      `Failed to delete site image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
