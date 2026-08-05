'use client';

import { Navigation, ChevronRight, Loader2 } from 'lucide-react';

interface AroundMeButtonProps {
  onClick: () => void;
  /** Shows a spinner and blocks re-entry while a fix is in flight. */
  busy?: boolean;
  className?: string;
}

/**
 * The primary Around Me entry point: the only filled navy block on a panel of
 * white cards, so it reads as *the* action rather than another filter. Sits
 * directly beneath the search input on the mobile homepage.
 *
 * The subtitle matters — it sets the expectation of a ranked list rather than a
 * recentred map, which is what the map crosshair (LocateMeButton) implies.
 */
export default function AroundMeButton({ onClick, busy = false, className }: AroundMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-center gap-3 rounded-xl bg-navy-900 px-3.5 py-2.5 min-h-[48px] text-left shadow-md transition-opacity disabled:opacity-70 ${className ?? ''}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-gold-400">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-[0.01em] text-white">Around Me</span>
        <span className="block text-[11px] text-white/65">
          {busy ? 'Finding your location…' : 'Holy sites nearest your location'}
        </span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-white/50" />
    </button>
  );
}

interface LocateMeButtonProps {
  onClick: () => void;
  busy?: boolean;
  /** Ring the button in gold while Around Me is active. */
  active?: boolean;
  className?: string;
}

/**
 * The map-native second entry point. Map users reach for this spot by reflex, and
 * it's the same affordance the Expo app already ships. Deliberately quieter than
 * AroundMeButton: it lands on the same state, but says nothing about a list.
 */
export function LocateMeButton({ onClick, busy = false, active = false, className }: LocateMeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Find holy sites around me"
      aria-pressed={active}
      className={`flex h-11 w-11 items-center justify-center rounded-lg bg-white/95 backdrop-blur-xs text-navy-700 shadow-md transition-shadow ${
        active ? 'ring-2 ring-gold-600' : ''
      } ${className ?? ''}`}
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <Crosshair />}
    </button>
  );
}

/** Lucide's Locate glyph, inlined so both buttons stay a single import. */
function Crosshair() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
