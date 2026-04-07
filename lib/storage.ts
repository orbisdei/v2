import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL_BASE } from './r2';

export async function uploadTagImage(
  tagId: string,
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const ext = fileName.split('.').pop() ?? 'jpg';
  const key = `tags/${tagId}/hero.${ext}`;

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
  oldTagId: string,
  newTagId: string,
): Promise<string | null> {
  // Returns the new URL, or null if there was no R2 image to rename
  const ext = 'jpg';
  const oldKey = `tags/${oldTagId}/hero.${ext}`;
  const newKey = `tags/${newTagId}/hero.${ext}`;

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
