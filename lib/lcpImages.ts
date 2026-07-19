// Shared LCP-image URL builders.
//
// These are used by BOTH the client components that render the page's
// largest-contentful image AND the server components that emit a matching
// `<link rel="preload" as="image">` for it (via ReactDOM.preload). Keeping the
// srcset/sizes in one place guarantees the preload and the rendered <img>
// resolve to the SAME candidate, so the browser fetches the LCP image exactly
// once (a mismatched preload would double-download and hurt LCP instead).
import { cfImage } from './imageUrl';

// ── Site-detail gallery (SiteDetailClient carousel) ──
// Mobile + stacked md layout: full width. Desktop split view: the left column
// is 1/2 (lg) / 45% (xl) of the viewport.
export const GALLERY_WIDTHS = [800, 1200, 1600];
export const GALLERY_QUALITY = 82;
export const GALLERY_SIZES = '(min-width: 1280px) 45vw, (min-width: 1024px) 50vw, 100vw';
export const gallerySrc = (url: string) => cfImage(url, 1600, GALLERY_QUALITY);
export const gallerySrcSet = (url: string) =>
  GALLERY_WIDTHS.map((w) => `${cfImage(url, w, GALLERY_QUALITY)} ${w}w`).join(', ');

// ── Location-tag hero banner (TagPageClient HeroBanner) ──
export const TAG_HERO_WIDTHS = [640, 960, 1600];
export const TAG_HERO_SIZES = '(min-width: 1024px) 50vw, 100vw';
export const tagHeroSrc = (url: string) => cfImage(url, 960);
export const tagHeroSrcSet = (url: string) =>
  TAG_HERO_WIDTHS.map((w) => `${cfImage(url, w)} ${w}w`).join(', ');

// ── Topic-tag image (TagPageClient centered/floated image) ──
// Single fixed-width candidate (no srcset) — displayed at ≤280px.
export const TOPIC_IMAGE_WIDTH = 640;
export const topicImageSrc = (url: string) => cfImage(url, TOPIC_IMAGE_WIDTH);

/**
 * Tag images encode their pixel dimensions in the filename
 * (`tags/{id}/{ts}-{w}x{h}.jpg`, written by uploadTagImage). Parsing them back
 * out lets the render layer reserve the image's box up front (aspect-ratio) so
 * it doesn't shift content when it loads — with no DB column and no risk of the
 * value drifting from the bytes, since dimensions and url are the same string.
 * Returns null for legacy (`hero.jpg`) or external urls; callers then skip
 * reservation and fall back to the prior natural-height behaviour.
 */
export function parseTagImageDims(url: string | null | undefined): { width: number; height: number } | null {
  if (!url) return null;
  const m = /-(\d+)x(\d+)\.jpg(?:[?#]|$)/.exec(url);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!width || !height) return null;
  return { width, height };
}
