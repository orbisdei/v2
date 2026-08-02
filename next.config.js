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
  // TypeScript 7 is the native/Go port (tsgo). It doesn't expose the
  // programmatic compiler API Next.js drives by default, so the build-time
  // type check fails with "TypeScript 7.0.2 does not provide the compiler API
  // required by Next.js" unless Next shells out to the TypeScript CLI
  // instead — which is what this flag does. Required as long as typescript is
  // on 7.x; removing it pins you back to TypeScript 6.
  experimental: {
    useTypeScriptCli: true,
  },
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
