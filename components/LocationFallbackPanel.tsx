'use client';

// The state most location features get wrong: an alert saying "location
// unavailable" and nothing else. A browser-level block cannot be undone from
// inside the page, so this panel has two jobs — give a working alternative right
// now, and say precisely how to lift the block.

import { useMemo, useState } from 'react';
import { MapPin, CircleOff, RotateCw, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import SearchInput from './SearchInput';
import { forwardGeocode } from '@/lib/geocode';
import { getCountryName } from '@/lib/countries';
import type { LocationSuggestion } from '@orbisdei/shared/src/geo';

interface LocationFallbackPanelProps {
  /**
   * 'denied' is terminal and needs unblock instructions; 'unavailable' is
   * retryable; 'manual' is the user deliberately choosing a place, so it carries
   * no failure framing at all.
   */
  reason: 'denied' | 'unavailable' | 'manual';
  message?: string | null;
  /** Densest municipalities in the catalog — quick picks that always have results. */
  suggestions: LocationSuggestion[];
  onPick: (lat: number, lng: number, label: string) => void;
  onRetry?: () => void;
  className?: string;
}

/** Per-browser wording for lifting a block. Generic elsewhere. */
function unblockSteps(): { label: string; steps: string[] } {
  if (typeof navigator === 'undefined') return { label: '', steps: [] };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);

  if (isIOS && isSafari) {
    return {
      label: 'To switch location back on',
      steps: ['Tap aA in the address bar', 'Choose Website Settings', 'Set Location to Ask'],
    };
  }
  if (/Android/.test(ua)) {
    return {
      label: 'To switch location back on',
      steps: ['Tap the lock icon in the address bar', 'Tap Permissions', 'Allow Location'],
    };
  }
  return {
    label: 'To switch location back on',
    steps: [
      'Click the lock or location icon in the address bar',
      'Allow location for orbisdei.org',
      'Reload the page',
    ],
  };
}

export default function LocationFallbackPanel({
  reason,
  message,
  suggestions,
  onPick,
  onRetry,
  className,
}: LocationFallbackPanelProps) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const guidance = useMemo(unblockSteps, []);

  async function submit() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setNotFound(false);
    const result = await forwardGeocode(q);
    setBusy(false);
    if (result.lat !== undefined && result.lon !== undefined) {
      onPick(result.lat, result.lon, q);
    } else {
      setNotFound(true);
    }
  }

  return (
    <div className={className}>
      <EmptyState
        className="py-6"
        icon={reason === 'denied' ? <CircleOff size={22} /> : <MapPin size={22} />}
        title={
          reason === 'denied'
            ? 'Location is turned off'
            : reason === 'manual'
              ? 'Search near a place'
              : 'Your location could not be found'
        }
        description={
          reason === 'denied'
            ? 'Your browser is blocking location for this site, so we can’t sort by distance. Enter a place instead, or switch it back on.'
            : reason === 'manual'
              ? 'Enter a town, city or postcode to see the holy sites nearest to it.'
              : (message ?? 'Enter a place instead, or try again.')
        }
        action={
          reason === 'unavailable' && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-navy-700"
            >
              <RotateCw size={14} />
              Try again
            </button>
          ) : undefined
        }
      />

      <div className="px-1">
        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="flex items-center gap-2"
        >
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={(v) => { setQuery(v); setNotFound(false); }}
              placeholder="Town, city or postcode"
              ariaLabel="Search for a place"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || busy}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white disabled:bg-gray-200 disabled:text-gray-400"
            aria-label="Use this place"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
          </button>
        </form>

        {notFound && (
          <p className="mt-1.5 text-[12px] text-gray-500">
            No place found for &ldquo;{query}&rdquo;. Try a nearby town or city.
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestions.map((s) => {
              const label = [s.municipality, s.country ? getCountryName(s.country) : null]
                .filter(Boolean)
                .join(', ');
              return (
                <button
                  key={`${s.municipality}-${s.country ?? ''}`}
                  type="button"
                  onClick={() => onPick(s.lat, s.lng, label)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-navy-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50"
                >
                  {s.municipality}
                  <span className="text-[11px] tabular-nums text-gray-500">{s.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {reason === 'denied' && guidance.steps.length > 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5">
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {guidance.label}
            </h3>
            <ol className="list-decimal pl-4 text-[11px] leading-relaxed text-gray-600">
              {guidance.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
