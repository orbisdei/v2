'use client';

// Site detail: "3.6km from you", or the button that offers to work it out.
//
// Deliberately opt-in. Nobody landing on a site page has asked how far away it
// is, so this never prompts for location by itself — it shows a quiet button, and
// becomes a chip only once a position exists. If the visitor already granted
// location earlier in the tab (Around Me on the homepage, say), the chip is there
// immediately with nothing to tap.

import { Locate, Loader2 } from 'lucide-react';
import { useLocationHandshake } from '@/lib/hooks/useLocationHandshake';
import { useDistanceUnit } from '@/lib/hooks/useUserLocation';
import { haversineMeters, formatDistance, type LocationSuggestion } from '@/lib/geo';

interface DistanceFromYouProps {
  latitude: number;
  longitude: number;
  suggestions: LocationSuggestion[];
  size?: 'sm' | 'md';
  className?: string;
}

export default function DistanceFromYou({
  latitude,
  longitude,
  suggestions,
  size = 'sm',
  className,
}: DistanceFromYouProps) {
  const { loc, begin, overlays, busy, ready } = useLocationHandshake(suggestions);
  const unit = useDistanceUnit();

  const text = size === 'md' ? 'text-[13px]' : 'text-[12px]';

  if (ready && loc.lat !== null && loc.lng !== null) {
    const meters = haversineMeters(loc.lat, loc.lng, latitude, longitude);
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-[#fef8e0] px-2 py-0.5 font-semibold text-[#8a6d0b] tabular-nums ${text} ${className ?? ''}`}
        title={loc.isManual ? `Straight-line distance from ${loc.label}` : 'Straight-line distance from you'}
      >
        <Locate size={11} />
        {formatDistance(meters, unit)} {loc.isManual && loc.label ? `from ${loc.label}` : 'from you'}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void begin()}
        className={`inline-flex items-center gap-1 text-navy-700 underline underline-offset-2 hover:text-navy-500 ${text} ${className ?? ''}`}
      >
        {busy ? <Loader2 size={11} className="animate-spin" /> : <Locate size={11} />}
        How far from me?
      </button>
      {overlays}
    </>
  );
}
