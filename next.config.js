/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig = {
  // The shared workspace package ships raw .ts source — Next must compile it.
  transpilePackages: ['@orbisdei/shared'],
  images: {
    // All next/image traffic goes through the Cloudflare Transformations
    // loader (R2 images resized at the edge; other hosts pass through
    // unoptimized). This bypasses Vercel's image optimizer entirely, so the
    // previous wide-open remotePatterns allowlist is no longer needed.
    loader: 'custom',
    loaderFile: './lib/cloudflareImageLoader.ts',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
