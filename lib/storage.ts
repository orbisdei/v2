import { PutObjectCommand } from '@aws-sdk/client-s3';
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
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  } catch (error) {
    throw new Error(`Failed to upload site image: ${error instanceof Error ? error.message : String(error)}`);
  }

  return `${R2_PUBLIC_URL_BASE}/${key}`;
}
