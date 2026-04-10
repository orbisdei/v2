import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createServiceClient } from '@/utils/supabase/server';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { uploadSiteImage } from '@/lib/storage';
import { importImageFromUrl } from '@/lib/imageImport';

const LOG = '[email-image-import]';

export async function POST(request: NextRequest) {
  // 1. Validate secret header
  const secret = request.headers.get('x-email-import-secret');
  if (!secret || secret !== process.env.EMAIL_IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type = 'staging', sender_email, subject, staging_key, filename, source_url } = body as {
    type?: string;
    sender_email?: string;
    subject?: string;
    staging_key?: string;
    filename?: string;
    source_url?: string;
  };

  const missingFields: string[] = [];
  if (!sender_email) missingFields.push('sender_email');
  if (!subject) missingFields.push('subject');
  if (type === 'url' && !source_url) missingFields.push('source_url');
  if (type !== 'url' && !staging_key) missingFields.push('staging_key');
  if (type !== 'url' && !filename) missingFields.push('filename');
  if (missingFields.length > 0) {
    return NextResponse.json({ error: `Missing fields: ${missingFields.join(', ')}` }, { status: 400 });
  }

  // 2. Parse site slug from subject
  let siteSlug: string | null = null;

  const urlMatch = (subject as string).match(/orbisdei\.org\/site\/([a-z0-9-]+)/);
  if (urlMatch) {
    siteSlug = urlMatch[1];
  } else {
    const tokens = (subject as string).split(/\s+/);
    const slugToken = tokens.find((t) => /^[a-z]{2}-[a-z0-9-]+$/.test(t));
    siteSlug = slugToken ?? null;
  }

  if (!siteSlug) {
    return NextResponse.json(
      { error: 'Could not parse site slug from subject' },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // 3. Look up sender in profiles
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, role')
    .eq('email', sender_email as string)
    .maybeSingle();

  if (profileError) {
    console.error(`${LOG} Profile lookup error:`, profileError.message);
    return NextResponse.json({ error: `Database error: ${profileError.message}` }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Sender email not recognised' }, { status: 403 });
  }

  if (profile.role === 'general') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // 4. Verify site exists
  const { data: site, error: siteError } = await service
    .from('sites')
    .select('id')
    .eq('id', siteSlug)
    .maybeSingle();

  if (siteError) {
    console.error(`${LOG} Site lookup error:`, siteError.message);
    return NextResponse.json({ error: `Database error: ${siteError.message}` }, { status: 500 });
  }

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // 5–7. Fetch, resize, and upload image
  let finalUrl: string;

  if (type === 'url') {
    // ── URL import path ──
    try {
      const result = await importImageFromUrl(source_url as string, 'site', siteSlug);
      finalUrl = result.url;
      // Attribution is discarded here — email import doesn't currently store it.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'URL import failed';
      console.error(`${LOG} URL import error:`, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    // ── Staging (attachment) path ──
    let rawBuffer: Buffer;
    try {
      const response = await r2Client.send(
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: staging_key as string })
      );
      const bytes = await (response.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
      rawBuffer = Buffer.from(bytes);
    } catch (err) {
      console.error(`${LOG} Failed to fetch staging image:`, err);
      return NextResponse.json({ error: 'Failed to fetch staging image' }, { status: 500 });
    }

    let resized: Buffer;
    try {
      resized = await sharp(rawBuffer)
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (err) {
      console.error(`${LOG} Failed to process image:`, err);
      return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
    }

    try {
      finalUrl = await uploadSiteImage(siteSlug, resized, 'email-import.jpg', 'image/jpeg');
    } catch (err) {
      console.error(`${LOG} Failed to upload image:`, err);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
  }

  // 8. Write to database based on role
  if (profile.role === 'administrator') {
    const { data: maxRow } = await service
      .from('site_images')
      .select('display_order')
      .eq('site_id', siteSlug)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxOrder: number = maxRow?.display_order ?? 0;

    const { error: insertError } = await service.from('site_images').insert({
      site_id: siteSlug,
      url: finalUrl,
      caption: null,
      attribution: null,
      storage_type: 'local',
      display_order: maxOrder + 1,
    });

    if (insertError) {
      console.error(`${LOG} DB insert error (site_images):`, insertError.message);
      return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
    }
  } else {
    // contributor
    const { error: insertError } = await service.from('pending_submissions').insert({
      type: 'site',
      action: 'edit',
      submitted_by: profile.id,
      status: 'pending',
      payload: {
        site_id: siteSlug,
        image_url: finalUrl,
        source: 'email',
        filename: filename as string,
      },
    });

    if (insertError) {
      console.error(`${LOG} DB insert error (pending_submissions):`, insertError.message);
      return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
    }
  }

  // 9. Delete staging object from R2 (best-effort, staging path only)
  if (type !== 'url') {
    try {
      await r2Client.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: staging_key as string })
      );
    } catch (err) {
      console.error(`${LOG} Failed to delete staging object (non-fatal):`, err);
    }
  }

  // 10. Return 200
  return NextResponse.json({
    ok: true,
    role: profile.role,
    site_id: siteSlug,
    url: finalUrl,
  });
}
