# Prompt 3: Attribution Display Overlays + Auto-Scrape API

## Context
Prompts 1 and 2 have already:
- Added `attribution` to `SiteImage` type, `ImageEntry`, all API routes, and `buildImagesPayload`
- Added attribution input fields and drag-and-drop reorder to `SiteForm`
- Updated `getHeroImageForLocationTag` to return `imageAttribution`

This prompt adds the visual display of attributions on images and the auto-scrape API route.

## Tasks

### 1. Update `GallerySlide` in `app/site/[slug]/SiteDetailClient.tsx`

The `GallerySlide` component currently accepts `caption?: string` and renders it in a gradient overlay at the bottom of the slide. Add an `attribution?: string` prop.

**Display logic** — the bottom overlay should show:
- If both caption and attribution exist: caption on line 1, attribution on line 2
- If only caption: just caption (current behavior, unchanged)
- If only attribution: just attribution
- If neither: no overlay (current behavior, unchanged)

**Styling:**
- Caption line: current styling (`text-white leading-snug`, `fontSize: isMobile ? 11 : 12`)
- Attribution line: slightly smaller and more muted — `text-[10px] text-white/70 leading-snug mt-0.5`
- The gradient overlay container remains the same for both cases

Update the `GallerySlide` call sites to pass `attribution={currImg.attribution}` (for the current slide) and `attribution={prevImg?.attribution}` (for the outgoing slide during transitions).

The `SiteGallery` component receives `images: Site['images']` — since `SiteImage` now has `attribution?: string`, no changes needed to the prop type.

### 2. Update `HeroBanner` in `app/tag/[slug]/TagPageClient.tsx`

The `HeroBanner` sub-component currently shows the tag name bottom-left and the site name link bottom-right. Add image attribution as a second line below the site name, both right-aligned.

**First:** the `TagPageClient` component needs to receive `heroImageAttribution` as a prop. Update the component's props interface to include `heroImageAttribution?: string | null`.

**In `app/tag/[slug]/page.tsx`** (the server component): Update the hero image resolution block. After calling `getHeroImageForLocationTag(tag.id)`, also capture `hero.imageAttribution`. Pass it to `TagPageClient` as `heroImageAttribution={hero?.imageAttribution ?? null}`.

**In `TagPageClient.tsx`:** Add a local variable:
```tsx
const resolvedHeroAttribution = tag.image_url ? null : (heroImageAttribution ?? null);
```

**In the `HeroBanner` sub-component:** Update the bottom-right block. Currently it's:
```tsx
{resolvedHeroSiteName && resolvedHeroSiteId && (
  <div className="absolute bottom-3 right-3">
    <Link ...>{resolvedHeroSiteName}<ChevronRight /></Link>
  </div>
)}
```

Change to a stacked layout:
```tsx
{(resolvedHeroSiteName || resolvedHeroAttribution) && (
  <div className="absolute bottom-3 right-3 text-right">
    {resolvedHeroSiteName && resolvedHeroSiteId && (
      <Link
        href={`/site/${resolvedHeroSiteId}`}
        className="inline-flex items-center gap-0.5 text-[11px] text-white/80 hover:text-white drop-shadow"
      >
        {resolvedHeroSiteName}
        <ChevronRight size={10} />
      </Link>
    )}
    {resolvedHeroAttribution && (
      <p className="text-[10px] text-white/60 drop-shadow mt-0.5">
        {resolvedHeroAttribution}
      </p>
    )}
  </div>
)}
```

### 3. Create `/app/api/scrape-attribution/route.ts`

New API route for auto-generating attribution text from a URL. Admin-only.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const attribution = await scrapeAttribution(url);
    return NextResponse.json({ attribution });
  } catch {
    return NextResponse.json({ attribution: null });
  }
}

async function scrapeAttribution(url: string): Promise<string | null> {
  const parsed = new URL(url);

  // ── Wikimedia Commons ──
  if (parsed.hostname === 'commons.wikimedia.org' || parsed.hostname === 'upload.wikimedia.org') {
    return scrapeWikimediaCommons(url);
  }

  // ── Wikipedia File: pages ──
  if (parsed.hostname.endsWith('.wikipedia.org') && parsed.pathname.includes('/File:')) {
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
  } else if (parsed.pathname.startsWith('/wiki/File:')) {
    fileName = decodeURIComponent(parsed.pathname.replace('/wiki/File:', ''));
  } else if (parsed.pathname.includes('/File:')) {
    // Wikipedia File: page
    const match = parsed.pathname.match(/File:(.+)/);
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

function extractMeta(html: string, name: string): string | null {
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

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() || null : null;
}
```

### 4. Add "Auto-fill" button in SiteForm image attribution row

In `components/admin/SiteForm.tsx`, for each image's attribution input, add a small button next to it that calls the scrape API. This button should only appear when:
- The form is not disabled
- The user's role would allow it (we can simplify: always show the button, the API will reject non-admins)
- The image has a URL (either `finalUrl` or `previewUrl` starting with `http`)

**Implementation:**

Add state for tracking which image is being scraped:
```tsx
const [scrapingId, setScrapingId] = useState<string | null>(null);
```

Add a scrape handler:
```tsx
async function handleScrapeAttribution(imgId: string, url: string) {
  setScrapingId(imgId);
  try {
    const res = await fetch('/api/scrape-attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (data.attribution) {
      updateImages((prev) =>
        prev.map((img) =>
          img.id === imgId ? { ...img, attribution: data.attribution } : img
        )
      );
    }
  } catch {
    // silently fail — user can type manually
  } finally {
    setScrapingId(null);
  }
}
```

Next to the attribution input, add:
```tsx
{!disabled && (img.finalUrl?.startsWith('http') || img.previewUrl.startsWith('http')) && (
  <button
    type="button"
    onClick={() => handleScrapeAttribution(img.id, img.finalUrl || img.previewUrl)}
    disabled={scrapingId === img.id}
    className="shrink-0 text-[11px] text-navy-600 hover:text-navy-800 font-medium whitespace-nowrap disabled:opacity-50"
  >
    {scrapingId === img.id ? 'Fetching…' : 'Auto-fill'}
  </button>
)}
```

Place this button inline to the right of the attribution input, inside a flex row wrapper around the input.

### 5. Add a standalone URL input for scraping attribution from any URL

Sometimes the image is uploaded locally but the user wants to scrape attribution from a Wikipedia or Wikimedia page that isn't the image URL itself. Add a small collapsible "Scrape from URL" affordance:

Below the attribution input + auto-fill button, add a tiny link: "Or paste a source URL to auto-fill →". When clicked, it reveals a small input + "Fetch" button. When the user pastes a URL and clicks Fetch, it calls the same `/api/scrape-attribution` endpoint with that URL and populates the attribution field.

Keep this minimal — a single-line input that appears on click and disappears after successful fetch.

## Verification
After all changes:
```bash
# TypeScript check
npx tsc --noEmit

# Verify new API route exists
ls -la app/api/scrape-attribution/route.ts

# Verify attribution display in gallery
grep -n "attribution" app/site/[slug]/SiteDetailClient.tsx

# Verify hero banner two-line overlay
grep -n "resolvedHeroAttribution\|imageAttribution" app/tag/[slug]/TagPageClient.tsx app/tag/[slug]/page.tsx

# Verify scrape handler in SiteForm
grep -n "scrapeAttribution\|scrapingId\|Auto-fill" components/admin/SiteForm.tsx

# Build check
npm run build
```
