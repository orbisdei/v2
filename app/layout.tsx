import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { UserSiteActionsProvider } from '@/context/UserSiteActionsContext';
import { ProfileProvider } from '@/context/ProfileContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';

export const metadata: Metadata = {
  title: {
    default: 'Orbis Dei — Discover Sacred Sites Worldwide',
    template: '%s — Orbis Dei',
  },
  description:
    'Discover Catholic and Christian places of interest worldwide. Explore beautiful churches, Marian sites, and places where saints have trod, all on an interactive map.',
  metadataBase: new URL(base),
  icons: {
    icon: '/images/favicon.ico',
  },
  openGraph: {
    siteName: 'Orbis Dei',
    type: 'website',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Orbis Dei — Discover Sacred Sites Worldwide' }],
  },
  twitter: {
    card: 'summary',
    site: '@orbisdei',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1e1e5f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Warm the image CDN connection before the parser reaches the first
            <img>; the LCP element on most pages is served from this host. */}
        <link rel="preconnect" href="https://images.orbisdei.org" />
        {/* Map tiles load post-hydration; DNS resolution is the cheap part
            worth doing early for the three OSM subdomains. */}
        <link rel="dns-prefetch" href="https://a.tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://b.tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://c.tile.openstreetmap.org" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ProfileProvider>
          <UserSiteActionsProvider>
            {children}
          </UserSiteActionsProvider>
        </ProfileProvider>
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics gaId="G-XR25W3EJPR" />
      </body>
    </html>
  );
}
