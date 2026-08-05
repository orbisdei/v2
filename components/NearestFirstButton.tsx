'use client';

// A "sort by distance" toggle for pages that are lists first and maps second:
// tag pages, list detail, search. The location handshake lives in
// useLocationHandshake; this is just the control that drives it.
//
// The homepage does NOT use this — there Around Me is a whole mode with a radius
// ladder and its own facets (see useAroundMe). Here distance is only ever a sort
// order applied to a set the page already has.

import { useCallback } from 'react';
import { Locate, Loader2 } from 'lucide-react';
import { useLocationHandshake } from '@/lib/hooks/useLocationHandshake';
import type { LocationSuggestion } from '@/lib/geo';

interface NearestFirstButtonProps {
  active: boolean;
  onChange: (active: boolean) => void;
  /** Quick-pick places for the blocked / manual fallback. */
  suggestions: LocationSuggestion[];
  size?: 'sm' | 'md';
  className?: string;
}

export default function NearestFirstButton({
  active,
  onChange,
  suggestions,
  size = 'sm',
  className,
}: NearestFirstButtonProps) {
  const onReady = useCallback(() => onChange(true), [onChange]);
  const { begin, overlays, busy } = useLocationHandshake(suggestions, onReady);

  const pad = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <>
      <button
        type="button"
        onClick={() => (active ? onChange(false) : void begin())}
        aria-pressed={active}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors ${pad} ${
          active
            ? 'border-navy-900 bg-navy-900 text-white'
            : 'border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
        } ${className ?? ''}`}
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Locate size={13} />}
        Nearest first
      </button>
      {overlays}
    </>
  );
}
