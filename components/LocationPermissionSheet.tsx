'use client';

// Shown BEFORE the browser's own geolocation prompt, and it is damage control
// rather than politeness: on iOS Safari a denied prompt is sticky and cannot be
// undone from inside the page, so firing getCurrentPosition() straight off a
// button tap spends a one-shot permission the user hasn't understood yet.
//
// Skip it entirely when navigator.permissions already reports 'granted' — see
// useUserLocation's permission probe.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Navigation, MapPin } from 'lucide-react';

interface LocationPermissionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fires the browser prompt. Must run inside this click handler's gesture. */
  onAllow: () => void;
  /** Switches to the manual place fallback instead of asking the browser. */
  onEnterPlace: () => void;
}

export default function LocationPermissionSheet({
  isOpen,
  onClose,
  onAllow,
  onEnterPlace,
}: LocationPermissionSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-9999" role="dialog" aria-modal="true" aria-labelledby="around-me-sheet-title">
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-5 pb-6 pt-2 shadow-xl md:left-1/2 md:bottom-auto md:top-1/2 md:w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-gray-200 md:hidden" />

        <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-full bg-[#fef8e0] text-gold-600">
          <Navigation size={24} />
        </div>

        <h2 id="around-me-sheet-title" className="mb-2 font-serif text-lg font-bold leading-tight text-navy-900">
          Find holy sites around you
        </h2>
        <p className="mb-1.5 text-[13px] leading-relaxed text-gray-500">
          Your browser will ask whether to share your location. Orbis Dei uses it once, on your
          device, to sort sites by distance.
        </p>
        <p className="text-[13px] font-medium leading-relaxed text-navy-900">
          It is never stored and never leaves your phone.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onAllow}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-navy-900 text-sm font-semibold text-white"
          >
            <Navigation size={15} />
            Use my location
          </button>
          <button
            type="button"
            onClick={onEnterPlace}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-navy-700"
          >
            <MapPin size={15} />
            Enter a place instead
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-gray-400">
          Sites are ranked by straight-line distance, so a nearer site may take longer to reach.
        </p>
      </div>
    </div>,
    document.body,
  );
}
