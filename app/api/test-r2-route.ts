/**
 * R2 Test API Route — deploy to Vercel, hit GET /api/test-r2 to verify.
 * DELETE THIS FILE after confirming it works. Do not leave in production.
 *
 * Required env vars in Vercel dashboard (Settings > Environment Variables):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL  (your custom domain, e.g. https://images.orbisdei.org)
 */

import { NextResponse } from 'next/server';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export async function GET() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } =
    process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'Missing R2 env vars' }, { status: 500 });
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  // 1x1 red PNG
  const testImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  );
  const testKey = `_r2-test/vercel-${Date.now()}.png`;
  const results: Record<string, string> = {};

  // Upload
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: testKey,
        Body: testImage,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    results.upload = 'PASS';
  } catch (err) {
    results.upload = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json(results, { status: 500 });
  }

  // Public URL fetch
  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${testKey}`
    : `(R2_PUBLIC_URL not set — add your custom domain)`;

  if (R2_PUBLIC_URL) {
    try {
      const res = await fetch(publicUrl);
      results.publicFetch = res.ok
        ? `PASS (${res.status}, ${res.headers.get('content-type')})`
        : `FAIL (HTTP ${res.status})`;
    } catch (err) {
      results.publicFetch = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    results.publicFetch = 'SKIPPED — R2_PUBLIC_URL not set';
  }

  results.publicUrl = publicUrl;

  // Clean up
  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: testKey })
    );
    results.cleanup = 'PASS';
  } catch (err) {
    results.cleanup = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
  }

  results.environment = `Node ${process.version}, ${process.platform}`;

  return NextResponse.json(results);
}
