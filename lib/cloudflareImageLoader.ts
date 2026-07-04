import { cfImage } from './imageUrl';

// Custom next/image loader (next.config.js images.loaderFile).
// R2-hosted images are transformed at the Cloudflare edge instead of going
// through Vercel's image optimizer; anything else (local static assets,
// external hosts) is served as-is.
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cfImage(src, width, quality ?? 80);
}
