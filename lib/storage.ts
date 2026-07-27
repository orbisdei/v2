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

// Versioned (timestamp-prefixed) key, shared by both site and tag images:
// replacing an image always yields a NEW url — a guaranteed CDN/browser
// cache miss — instead of overwriting a `max-age=31536000, immutable`
// long-lived-cached key with different bytes (the old stable per-position
// site key and the old stable `hero.jpg` tag key both made replacements
// stick for up to a year). `suffix` is optional free text appended after the
// timestamp — tags use it for `{w}x{h}` (parseTagImageDims reserves the
// image box with no DB column); sites use the sanitized original filename,
// purely for readability in the R2 console.
function versionedImageKey(kind: 'sites' | 'tags', id: string, suffix?: string): string {
  const name = suffix ? `${Date.now()}-${suffix}` : `${Date.now()}`;
  return `${kind}/${id}/${name}.jpg`;
}

async function putVersionedImage(key: string, file: Buffer, contentType: string): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${R2_PUBLIC_URL_BASE}/${key}`;
}

export async function uploadTagImage(
  tagId: string,
  file: Buffer,
  width: number,
  height: number,
  contentType = 'image/jpeg',
): Promise<string> {
  try {
    return await putVersionedImage(versionedImageKey('tags', tagId, `${width}x${height}`), file, contentType);
  } catch (error) {
    throw new Error(`Failed to upload tag image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function uploadSiteImage(
  siteId: string,
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  try {
    return await putVersionedImage(versionedImageKey('sites', siteId, fileName), file, contentType);
  } catch (error) {
    throw new Error(`Failed to upload site image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function isR2Url(url: string): boolean {
  return url.startsWith(R2_PUBLIC_URL_BASE);
}

// Moves an R2 image under a new site/tag id on a slug rename — the versioned
// filename never changes, only the id prefix, so the `-{w}x{h}` (tags) or
// original-name (sites) suffix survives the move. Returns null if there's no
// R2 object to move (already-moved / never had one), silently — a missing
// source object isn't an error here.
async function renameVersionedImage(
  oldUrl: string,
  kind: 'sites' | 'tags',
  newId: string,
): Promise<string | null> {
  if (!oldUrl.startsWith(R2_PUBLIC_URL_BASE)) return null;
  const oldKey = oldUrl.slice(R2_PUBLIC_URL_BASE.length + 1); // +1 for the /
  const fileName = oldKey.split('/').pop();
  if (!fileName) return null;
  const newKey = `${kind}/${newId}/${fileName}`;

  if (oldKey === newKey) return oldUrl;

  try {
    const downloadCommand = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: oldKey,
    });
    const response = await r2Client.send(downloadCommand);
    const bodyBuffer = await (response.Body as any).transformToByteArray();
    const contentType = response.ContentType || 'image/jpeg';

    await putVersionedImage(newKey, bodyBuffer, contentType);

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
      `Failed to rename ${kind === 'sites' ? 'site' : 'tag'} image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function renameSiteImage(oldUrl: string, newSiteId: string): Promise<string | null> {
  return renameVersionedImage(oldUrl, 'sites', newSiteId);
}

export function renameTagImage(oldUrl: string, newTagId: string): Promise<string | null> {
  return renameVersionedImage(oldUrl, 'tags', newTagId);
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
