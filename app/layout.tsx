import type { Metadata } from 'next';
import './globals.css';
import { UserSiteActionsProvider } from '@/context/UserSiteActionsContext';

export const metadata: Metadata = {
  title: 'Orbis Dei — Explore Catholic Holy Sites & Pilgrimage Destinations',
  description:
    'Discover Catholic and Christian places of interest worldwide. Explore churches, shrines, basilicas, and pilgrimage destinations on an interactive map.',
  icons: {
    icon: '/images/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Leaflet CSS — loaded globally since the map is on the main page */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"
          crossOrigin=""
        />
        {/* Inter font for body text */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <UserSiteActionsProvider>
          {children}
        </UserSiteActionsProvider>
      </body>
    </html>
  );
}
