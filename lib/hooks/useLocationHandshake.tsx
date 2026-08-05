'use client';

// The full "get me a position" handshake, in one place: pre-prompt sheet →
// browser request → blocked/unavailable fallback → manual place entry.
//
// Extracted because three separate controls need the identical flow
// (NearestFirstButton on tag/list/search pages, DistanceFromYou on site detail,
// and any future one). The homepage doesn't use it — there the same states are
// laid out inline as full panels rather than modals, because Around Me is a whole
// mode there rather than one control.
//
// Render `overlays` somewhere in the consumer's tree and call `begin()` from a
// user gesture. `onReady` fires only when a position actually resolved.

import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import LocationPermissionSheet from '@/components/LocationPermissionSheet';
import LocationFallbackPanel from '@/components/LocationFallbackPanel';
import { useUserLocation, getUserLocationSnapshot } from './useUserLocation';
import type { LocationSuggestion } from '@/lib/geo';

export function useLocationHandshake(
  suggestions: LocationSuggestion[],
  onReady?: () => void,
) {
  const loc = useUserLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [manual, setManual] = useState(false);

  /** Run the browser request and act on what actually happened. `loc` here is the
   *  pre-await closure, so the outcome must come from the module snapshot. */
  const settleRequest = useCallback(async () => {
    await loc.request();
    if (getUserLocationSnapshot().status === 'ready') {
      onReady?.();
    } else {
      setManual(false);
      setFallbackOpen(true);
    }
  }, [loc, onReady]);

  const begin = useCallback(async () => {
    if (loc.status === 'ready') { onReady?.(); return; }
    // A browser-level block can't be lifted from in here, so go straight to the
    // manual-place fallback rather than firing a prompt that cannot succeed.
    if (loc.permission === 'denied' || loc.status === 'denied') {
      setManual(false);
      setFallbackOpen(true);
      return;
    }
    // Nothing left to explain once permission is already granted.
    if (loc.permission === 'granted') { await settleRequest(); return; }
    setSheetOpen(true);
  }, [loc, onReady, settleRequest]);

  /** Open the manual place entry directly (e.g. a "Change" affordance). */
  const beginManual = useCallback(() => {
    setSheetOpen(false);
    setManual(true);
    setFallbackOpen(true);
  }, []);

  const pick = useCallback((lat: number, lng: number, label: string) => {
    loc.setManual(lat, lng, label);
    setFallbackOpen(false);
    onReady?.();
  }, [loc, onReady]);

  const overlays = (
    <>
      <LocationPermissionSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAllow={() => { setSheetOpen(false); void settleRequest(); }}
        onEnterPlace={beginManual}
      />

      {fallbackOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-9999" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setFallbackOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-3 shadow-xl md:left-1/2 md:bottom-auto md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
          >
            <button
              type="button"
              onClick={() => setFallbackOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={17} />
            </button>
            <LocationFallbackPanel
              reason={manual ? 'manual' : loc.status === 'unavailable' ? 'unavailable' : 'denied'}
              message={loc.error}
              suggestions={suggestions}
              onPick={pick}
              onRetry={() => void settleRequest()}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );

  return {
    loc,
    begin,
    beginManual,
    overlays,
    busy: loc.status === 'locating',
    ready: loc.status === 'ready',
  };
}
