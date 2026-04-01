import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient } from '@/utils/supabase/server';
import { uploadSiteImage, uploadTagImage } from '@/lib/storage';
import { scrapeAttribution } from '@/lib/attribution';

export async function POST(req: NextRequest) {
  // Auth check — contributor or administrator
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { url?: unknown; entity_type?: unknown; entity_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, entity_type, entity_id } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  if (entity_type !== 'site' && entity_type !== 'tag') {
    return NextResponse.json({ error: 'entity_type must be "site" or "tag"' }, { status: 400 });
  }
  if (!entity_id || typeof entity_id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(entity_id)) {
    return NextResponse.json({ error: 'Invalid entity_id format' }, { status: 400 });
  }

  // Validate the source URL is HTTP(S)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Not HTTP(S)');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Determine actual image download URL
  let downloadUrl = url;

  const isWikimediaCommons =
    parsedUrl.hostname === 'commons.wikimedia.org' && parsedUrl.pathname.includes('/wiki/File:');
  const isWikipediaFilePage =
    parsedUrl.hostname.endsWith('.wikipedia.org') && /\/wiki\/[^/:]+:/.test(parsedUrl.pathname);

  if (isWikimediaCommons || isWikipediaFilePage) {
    const match = parsedUrl.pathname.match(/\/wiki\/[^/:]+:(.+)/);
    const fileName = match ? decodeURIComponent(match[1]) : null;
    if (fileName) {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      try {
        const apiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org)' },
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const pages = apiData?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0] as Record<string, unknown>;
            const imageinfo = (page.imageinfo as Record<string, unknown>[])?.[0];
            const imageUrl = imageinfo?.url as string | undefined;
            if (imageUrl) downloadUrl = imageUrl;
          }
        }
      } catch {
        // Fall through to direct download
      }
    }
  }

  // Fetch the image with a 15-second timeout
  let imageBuffer: Buffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let fetchRes: Response;
    try {
      fetchRes = await fetch(downloadUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org)' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!fetchRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
    }

    const contentType = fetchRes.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }

    imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch image from URL' }, { status: 400 });
  }

  // Resize with sharp: max 1600px, JPEG 85%
  let resizedBuffer: Buffer;
  try {
    resizedBuffer = await sharp(imageBuffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }

  // Upload to R2
  let uploadedUrl: string;
  try {
    if (entity_type === 'site') {
      uploadedUrl = await uploadSiteImage(entity_id, resizedBuffer, 'imported.jpg', 'image/jpeg');
    } else {
      uploadedUrl = await uploadTagImage(entity_id, resizedBuffer, 'imported.jpg', 'image/jpeg');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Scrape attribution from the original URL
  let attribution: string | null = null;
  try {
    attribution = await scrapeAttribution(url);
  } catch {
    // Attribution is best-effort
  }

  return NextResponse.json({ url: uploadedUrl, attribution });
}
