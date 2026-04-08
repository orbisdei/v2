import sharp from 'sharp';
import { uploadSiteImage, uploadTagImage } from '@/lib/storage';
import { scrapeAttribution } from '@/lib/attribution';

export interface ImportImageResult {
  url: string;
  attribution: string | null;
}

/**
 * Fetches an image from a URL (resolving Wikimedia/Flickr pages to direct image URLs),
 * resizes it with sharp, uploads to R2, and returns the final URL + scraped attribution.
 *
 * No auth logic — callers are responsible for verifying permissions before calling this.
 */
export async function importImageFromUrl(
  sourceUrl: string,
  entityType: 'site' | 'tag',
  entityId: string,
): Promise<ImportImageResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Not HTTP(S)');
    }
  } catch {
    throw new Error('Invalid URL');
  }

  // Resolve actual download URL (Wikimedia Commons, Wikipedia File pages, Flickr)
  let downloadUrl = sourceUrl;

  const isWikimediaCommons =
    parsedUrl.hostname === 'commons.wikimedia.org' &&
    parsedUrl.pathname.includes('/wiki/File:');
  const isWikipediaFilePage =
    parsedUrl.hostname.endsWith('.wikipedia.org') &&
    /\/wiki\/[^/:]+:/.test(parsedUrl.pathname);

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

  const isFlickrPhotoPage =
    parsedUrl.hostname.includes('flickr.com') &&
    /\/photos\/[^/]+\/\d+/.test(parsedUrl.pathname);

  if (isFlickrPhotoPage) {
    try {
      const oembedUrl = `https://www.flickr.com/services/oembed/?format=json&url=${encodeURIComponent(sourceUrl)}`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org)' },
      });
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed.url && typeof oembed.url === 'string') {
          downloadUrl = oembed.url;
        }
      }
    } catch {
      // Fall through to direct download
    }
  }

  // Fetch image with 15-second timeout
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

    if (!fetchRes.ok) throw new Error('Failed to fetch image from URL');

    const contentType = fetchRes.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) throw new Error('URL does not point to an image');

    imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Failed to fetch image from URL');
    }
    throw err;
  }

  // Resize with sharp
  const resizedBuffer = await sharp(imageBuffer)
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  // Upload to R2
  let uploadedUrl: string;
  if (entityType === 'site') {
    uploadedUrl = await uploadSiteImage(entityId, resizedBuffer, 'imported.jpg', 'image/jpeg');
  } else {
    uploadedUrl = await uploadTagImage(entityId, resizedBuffer, 'imported.jpg', 'image/jpeg');
  }

  // Scrape attribution (best-effort)
  let attribution: string | null = null;
  try {
    attribution = await scrapeAttribution(sourceUrl);
  } catch {
    // Attribution is optional
  }

  return { url: uploadedUrl, attribution };
}
