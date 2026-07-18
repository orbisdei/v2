// Cloudflare Image Transformations URL builder. Client-safe (no env vars).
//
// Images live in R2 behind images.orbisdei.org (Cloudflare zone with
// Transformations enabled). Wrapping a URL as
//   https://images.orbisdei.org/cdn-cgi/image/<options>/<path>
// makes Cloudflare resize/re-encode at the edge and cache the result.
// format=auto serves WebP/AVIF to browsers that accept them.
//
// URLs on any other host (external images, legacy Supabase storage, Google
// avatars, local /images assets) pass through untouched.

const TRANSFORM_HOST = 'images.orbisdei.org';

export function cfImage(
  url: string,
  width: number,
  quality = 80,
): string {
  try {
    const u = new URL(url);
    if (u.hostname !== TRANSFORM_HOST) return url;
    if (u.pathname.startsWith('/cdn-cgi/')) return url; // already transformed
    return `${u.origin}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down${u.pathname}`;
  } catch {
    return url; // relative or malformed URL — leave as-is
  }
}

/** Optional-input convenience for `url?: string` call sites. */
export function cfImageOpt(
  url: string | null | undefined,
  width: number,
  quality = 80,
): string | undefined {
  return url ? cfImage(url, width, quality) : undefined;
}
