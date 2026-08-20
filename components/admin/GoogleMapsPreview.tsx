'use client';

import { useEffect, useState } from 'react';
import { buildGoogleMapsEmbedUrl } from '@/lib/geocode';

interface GoogleMapsPreviewProps {
  googleMapsUrl: string;
}

/**
 * Small iframe viewport showing where the stored google_maps_url actually
 * renders on Google Maps — via the official Maps Embed API
 * (NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY). Debounced so typing in the URL
 * field doesn't reload the iframe on every keystroke.
 */
export function GoogleMapsPreview({ googleMapsUrl }: GoogleMapsPreviewProps) {
  const [debounced, setDebounced] = useState(googleMapsUrl);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(googleMapsUrl), 600);
    return () => clearTimeout(t);
  }, [googleMapsUrl]);

  const embedUrl = buildGoogleMapsEmbedUrl(debounced);

  if (!embedUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 text-center px-3"
        style={{ height: 180 }}
      >
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
          ? 'Preview unavailable — NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY is not set'
          : debounced.trim()
          ? "Can't generate a preview for this link"
          : 'No Google Maps URL set'}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 180 }}>
      <iframe
        key={embedUrl}
        src={embedUrl}
        title="Where this Google Maps URL renders"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
