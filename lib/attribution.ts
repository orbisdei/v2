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
    return scrapeOpenGraph(url, 'Flickr');
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
