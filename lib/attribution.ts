export async function scrapeAttribution(url: string): Promise<string | null> {
  const parsed = new URL(url);

  // ── Wikimedia Commons ──
  if (parsed.hostname === 'commons.wikimedia.org' || parsed.hostname === 'upload.wikimedia.org') {
    return scrapeWikimediaCommons(url);
  }

  // ── Wikipedia File: pages (any language namespace: File:, Fichier:, Datei:, Archivo:, etc.) ──
  if (parsed.hostname.endsWith('.wikipedia.org') && /\/wiki\/[^/:]+:/.test(parsed.pathname)) {
    return scrapeWikimediaCommons(url);
  }

  // ── Flickr ──
  if (parsed.hostname.includes('flickr.com')) {
    return scrapeFlickr(url);
  }

  // ── Generic: best-effort OG scraping ──
  return scrapeOpenGraph(url);
}

async function scrapeWikimediaCommons(url: string): Promise<string | null> {
  // Extract filename from various URL formats
  let fileName: string | null = null;

  const parsed = new URL(url);

  if (parsed.hostname === 'upload.wikimedia.org') {
    // Direct file URL: extract filename from path
    const parts = parsed.pathname.split('/');
    fileName = decodeURIComponent(parts[parts.length - 1]);
  } else if (parsed.hostname.endsWith('.wikipedia.org') || parsed.pathname.startsWith('/wiki/File:') || parsed.pathname.includes('/File:')) {
    // Wikipedia file pages — any language namespace (File:, Fichier:, Datei:, Archivo:, etc.)
    const match = parsed.pathname.match(/\/wiki\/[^/:]+:(.+)/);
    if (match) fileName = decodeURIComponent(match[1]);
  }

  if (!fileName) return null;

  // Query Wikimedia API for metadata
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=extmetadata&format=json&origin=*`;

  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org; admin tool)' },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0] as Record<string, unknown>;
  const imageinfo = (page.imageinfo as Record<string, unknown>[])?.[0];
  const meta = imageinfo?.extmetadata as Record<string, { value: string }> | undefined;

  if (!meta) return null;

  // Extract fields
  const artistRaw = meta.Artist?.value ?? '';
  // Strip HTML tags from artist
  const artist = artistRaw.replace(/<[^>]*>/g, '').trim();
  const license = meta.LicenseShortName?.value ?? '';

  const parts: string[] = [];
  if (artist) parts.push(artist);
  if (license) parts.push(license);
  parts.push('via Wikimedia Commons');

  return parts.join(', ');
}

// Flickr license IDs → short names (from Flickr API docs)
const FLICKR_LICENSES: Record<string, string> = {
  '0': 'All Rights Reserved',
  '1': 'CC BY-NC-SA 2.0',
  '2': 'CC BY-NC 2.0',
  '3': 'CC BY-NC-ND 2.0',
  '4': 'CC BY 2.0',
  '5': 'CC BY-SA 2.0',
  '6': 'CC BY-ND 2.0',
  '7': 'No known copyright restrictions',
  '8': 'United States Government Work',
  '9': 'CC0 1.0',
  '10': 'Public Domain Mark',
};

async function scrapeFlickr(url: string): Promise<string | null> {
  const UA = 'OrbissDei/1.0 (orbisdei.org; admin tool)';

  // Step 1: Fetch the HTML page to extract license and structured data
  let html = '';
  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    if (pageRes.ok) html = await pageRes.text();
  } catch {
    // continue — we'll try oembed
  }

  // Step 2: Get author and license info from oembed (no API key needed)
  // Flickr's oembed response includes license, license_url, and license_id fields.
  let authorName = '';
  let authorUsername = '';
  let licenseName = '';
  try {
    const oembedUrl = `https://www.flickr.com/services/oembed/?format=json&url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl, { headers: { 'User-Agent': UA } });
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      authorName = (oembed.author_name ?? '').trim();
      // author_url is like "https://www.flickr.com/photos/bsmith84/"
      const authorUrlStr = (oembed.author_url ?? '') as string;
      const authorMatch = authorUrlStr.match(/\/photos\/([^/]+)/);
      if (authorMatch) authorUsername = authorMatch[1];
      // Flickr oembed includes license as a pre-formatted string (e.g. "CC BY-NC-ND 2.0")
      if (oembed.license && typeof oembed.license === 'string') {
        licenseName = oembed.license.trim();
      } else if (oembed.license_id && FLICKR_LICENSES[String(oembed.license_id)]) {
        licenseName = FLICKR_LICENSES[String(oembed.license_id)];
      }
    }
  } catch {
    // continue with whatever we have
  }

  // Step 3: Extract license from HTML as fallback
  if (!licenseName) {
    const typeMap: Record<string, string> = {
      'by': 'CC BY',
      'by-sa': 'CC BY-SA',
      'by-nc': 'CC BY-NC',
      'by-nd': 'CC BY-ND',
      'by-nc-sa': 'CC BY-NC-SA',
      'by-nc-nd': 'CC BY-NC-ND',
    };
    const ccMatch = html.match(/creativecommons\.org\/licenses\/([^/"]+)\/([^/"]+)/i);
    if (ccMatch) {
      const key = ccMatch[1].toLowerCase();
      licenseName = `${typeMap[key] ?? `CC ${ccMatch[1].toUpperCase()}`} ${ccMatch[2]}`;
    } else if (html.includes('creativecommons.org/publicdomain/zero')) {
      licenseName = 'CC0 1.0';
    } else if (html.includes('creativecommons.org/publicdomain/mark')) {
      licenseName = 'Public Domain Mark';
    } else {
      const licenseIdMatch = html.match(/"license"\s*:\s*"?(\d+)"?/);
      if (licenseIdMatch && FLICKR_LICENSES[licenseIdMatch[1]]) {
        licenseName = FLICKR_LICENSES[licenseIdMatch[1]];
      }
    }
  }

  // Fallback: try og/meta scraping for author if oembed failed
  if (!authorName && !authorUsername) {
    authorName = extractMeta(html, 'og:title') ?? '';
  }

  // Build attribution string: "RealName/username, License, via Flickr"
  const parts: string[] = [];

  if (authorName && authorUsername) {
    // Show "RealName/username" if real name differs from username
    if (authorName.toLowerCase() !== authorUsername.toLowerCase()) {
      parts.push(`${authorName}/${authorUsername}`);
    } else {
      parts.push(authorUsername);
    }
  } else if (authorName) {
    parts.push(authorName);
  } else if (authorUsername) {
    parts.push(authorUsername);
  }

  if (licenseName) parts.push(licenseName);
  parts.push('via Flickr');

  return parts.length > 1 ? parts.join(', ') : null;
}

async function scrapeOpenGraph(url: string, siteName?: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org; admin tool)' },
    redirect: 'follow',
  });

  if (!res.ok) return null;

  const html = await res.text();

  // Extract meta tags
  const ogTitle = extractMeta(html, 'og:title');
  const ogSiteName = extractMeta(html, 'og:site_name') || siteName;
  const author = extractMeta(html, 'author') || extractMeta(html, 'dc.creator');
  const title = extractTag(html, 'title');

  const parts: string[] = [];
  if (author) parts.push(author);
  else if (ogTitle && ogTitle !== title) parts.push(ogTitle);
  if (ogSiteName) parts.push(`via ${ogSiteName}`);

  return parts.length > 0 ? parts.join(', ') : null;
}

export function extractMeta(html: string, name: string): string | null {
  // Match both property="" and name="" variants
  const regex = new RegExp(
    `<meta\\s+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s+content=["']([^"']*)["']`,
    'i'
  );
  const match = html.match(regex);
  if (match) return match[1].trim() || null;

  // Also try content first, then property/name
  const regex2 = new RegExp(
    `<meta\\s+content=["']([^"']*)["']\\s+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i'
  );
  const match2 = html.match(regex2);
  return match2 ? match2[1].trim() || null : null;
}

export function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() || null : null;
}
