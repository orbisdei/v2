import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface PhotoResult {
  source: 'wikimedia' | 'unsplash';
  url: string;
  thumbnail_url: string;
  attribution: string;
  license: string;
  title?: string;
}

export async function POST(request: NextRequest) {
  // Auth — administrator only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator')
    return NextResponse.json({ error: 'Forbidden — administrators only' }, { status: 403 });

  let body: { site_id?: unknown; query?: unknown; sources?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, sources } = body;
  if (!query || typeof query !== 'string')
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  if (!Array.isArray(sources))
    return NextResponse.json({ error: 'sources must be an array' }, { status: 400 });

  const results: PhotoResult[] = [];
  const UA = 'OrbissDei/1.0 (orbisdei.org; admin tool)';

  // ── Wikimedia Commons ──────────────────────────────────────────
  if (sources.includes('wikimedia')) {
    try {
      // gsrnamespace=6 restricts to File namespace (images only)
      // iiurlwidth=400 generates a thumburl field at ~400px wide
      const apiUrl =
        `https://commons.wikimedia.org/w/api.php` +
        `?action=query&generator=search` +
        `&gsrsearch=${encodeURIComponent(query)}` +
        `&gsrnamespace=6&gsrlimit=12` +
        `&prop=imageinfo&iiprop=url|thumburl|extmetadata&iiurlwidth=400` +
        `&format=json&origin=*`;

      const res = await fetch(apiUrl, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const data = await res.json();
        const pages = data?.query?.pages;
        if (pages && typeof pages === 'object') {
          for (const page of Object.values(pages) as Record<string, unknown>[]) {
            const imageinfo = (page.imageinfo as Record<string, unknown>[])?.[0];
            if (!imageinfo) continue;

            const url = imageinfo.url as string;
            if (!url) continue;

            // Skip non-image files (SVG, OGG, PDF, etc.)
            if (!/\.(jpe?g|png|webp|gif)$/i.test(url)) continue;

            // thumburl is present when iiurlwidth is set; fall back to full url
            const thumbUrl = (imageinfo.thumburl as string | undefined) ?? url;

            const meta = imageinfo.extmetadata as
              | Record<string, { value: string }>
              | undefined;
            const licenseShortName = meta?.LicenseShortName?.value ?? '';
            const artistRaw = meta?.Artist?.value ?? '';
            const artist = artistRaw.replace(/<[^>]*>/g, '').trim();

            const parts: string[] = [];
            if (artist) parts.push(artist);
            if (licenseShortName) parts.push(licenseShortName);
            parts.push('via Wikimedia Commons');

            results.push({
              source: 'wikimedia',
              url,
              thumbnail_url: thumbUrl,
              attribution: parts.join(', '),
              license: licenseShortName || 'Unknown',
              title: (page.title as string | undefined)?.replace(/^File:/, '') ?? undefined,
            });
          }
        }
      }
    } catch {
      // Skip source on error
    }
  }

  // ── Unsplash ───────────────────────────────────────────────────
  if (sources.includes('unsplash')) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (accessKey) {
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
          { headers: { Authorization: `Client-ID ${accessKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          for (const photo of (data.results ?? []) as Record<string, unknown>[]) {
            const urls = photo.urls as Record<string, string>;
            const photoUser = photo.user as Record<string, unknown>;
            const userName = (photoUser?.name as string) ?? 'Unknown';

            results.push({
              source: 'unsplash',
              url: urls.regular,
              thumbnail_url: urls.thumb ?? urls.small ?? urls.regular,
              attribution: `Photo by ${userName} on Unsplash`,
              license: 'Unsplash License',
              title: (photo.description as string | null) ?? (photo.alt_description as string | null) ?? undefined,
            });
          }
        }
      } catch {
        // Skip source on error
      }
    }
  }

  return NextResponse.json({ results });
}
