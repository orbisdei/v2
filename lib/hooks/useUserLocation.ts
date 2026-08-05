'use client';

// Module-singleton user location, in the same shape as useAuthUser: one piece of
// state shared by every component that asks for it, so granting location on the
// homepage carries to the tag page, site detail and list detail without a second
// browser prompt.
//
// Two rules this hook exists to enforce:
//
// 1. NEVER request location on mount. On iOS Safari a denied geolocation prompt
//    is sticky and cannot be undone from inside the page, so the prompt is only
//    ever fired from an explicit user gesture (`request()`).
// 2. Nothing is persisted. No localStorage, no cookie, no network write — the
//    coordinates live in this module for the life of the tab and nowhere else.
//    That is what the permission sheet promises the user, so don't "improve" it
//    by caching to storage.

import { useEffect, useState } from 'react';
import { reverseGeocode } from '@/lib/geocode';
import { getCountryName } from '@/lib/countries';
import { resolveDistanceUnit, type DistanceUnit } from '@orbisdei/shared/src/geo';

export type LocationStatus =
  | 'idle'        // never asked
  | 'locating'    // prompt showing, or fix in flight
  | 'ready'       // we have coordinates
  | 'denied'      // user (or browser policy) refused — do not re-prompt
  | 'unavailable'; // timeout / position unavailable / no geolocation API

/** What the browser says about the permission, before we ask for a fix. */
export type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied';

export interface UserLocation {
  status: LocationStatus;
  lat: number | null;
  lng: number | null;
  /** Reported accuracy radius in metres. Null for a manually entered place. */
  accuracyMeters: number | null;
  /** "Rome, Italy" — reverse-geocoded, or the place the user typed. */
  label: string | null;
  isManual: boolean;
  permission: PermissionState;
  /** User-facing failure text, already phrased for display. */
  error: string | null;
}

const INITIAL: UserLocation = {
  status: 'idle',
  lat: null,
  lng: null,
  accuracyMeters: null,
  label: null,
  isManual: false,
  permission: 'unknown',
  error: null,
};

let state: UserLocation = INITIAL;
const subscribers = new Set<(s: UserLocation) => void>();

function set(patch: Partial<UserLocation>) {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn(state));
}

/** Query the Permissions API so a user who already granted skips the pre-prompt. */
let permissionProbe: Promise<void> | null = null;
function probePermission(): Promise<void> {
  if (permissionProbe) return permissionProbe;
  permissionProbe = (async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const map = (s: string): PermissionState =>
        s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';
      set({
        permission: map(result.state),
        // A browser-level block is terminal: reflect it immediately so the UI can
        // offer the manual-place fallback rather than a button that cannot work.
        ...(result.state === 'denied' && state.status === 'idle' ? { status: 'denied' as const } : {}),
      });
      result.onchange = () => set({ permission: map(result.state) });
    } catch {
      // Firefox historically threw on the geolocation descriptor. Staying
      // 'unknown' just means the pre-prompt shows, which is the safe default.
    }
  })();
  return permissionProbe;
}

/** Best-effort human label. Never blocks or fails the fix itself. */
async function resolveLabel(lat: number, lng: number) {
  const geo = await reverseGeocode(lat, lng);
  if (geo.error) return;
  const parts = [geo.municipality, geo.country ? getCountryName(geo.country) : undefined].filter(
    Boolean,
  );
  if (parts.length > 0) set({ label: parts.join(', ') });
}

/**
 * Ask the browser for a position. Must be called from a user gesture.
 * Resolves once the attempt settles, so callers can await it before showing
 * results; read `status` for the outcome.
 */
export async function requestUserLocation(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    set({ status: 'unavailable', error: 'This browser cannot share your location.' });
    return;
  }
  set({ status: 'locating', error: null });

  await new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          status: 'ready',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          isManual: false,
          permission: 'granted',
          label: null,
          error: null,
        });
        // Label is cosmetic and Nominatim is paced at ~1.1s — don't make the
        // ranked list wait on it.
        void resolveLabel(pos.coords.latitude, pos.coords.longitude);
        resolve();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          set({
            status: 'denied',
            permission: 'denied',
            error: 'Location is turned off for this site.',
          });
        } else {
          set({
            status: 'unavailable',
            error:
              err.code === err.TIMEOUT
                ? 'Finding your location took too long.'
                : 'Your location could not be determined.',
          });
        }
        resolve();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/**
 * Read the current state synchronously. Needed after `await requestUserLocation()`
 * — a component's `loc` object is the pre-await render's closure, so checking it
 * there would report the outcome of the *previous* attempt.
 */
export function getUserLocationSnapshot(): UserLocation {
  return state;
}

/** Adopt a place the user typed instead of a device fix. */
export function setManualUserLocation(lat: number, lng: number, label: string) {
  set({
    status: 'ready',
    lat,
    lng,
    accuracyMeters: null,
    label,
    isManual: true,
    error: null,
  });
}

/** Drop the position and return to the browse view. Permission state survives. */
export function clearUserLocation() {
  set({ status: state.permission === 'denied' ? 'denied' : 'idle', lat: null, lng: null, accuracyMeters: null, label: null, isManual: false, error: null });
}

export function useUserLocation(): UserLocation & {
  request: typeof requestUserLocation;
  setManual: typeof setManualUserLocation;
  clear: typeof clearUserLocation;
} {
  const [local, setLocal] = useState<UserLocation>(state);

  useEffect(() => {
    subscribers.add(setLocal);
    setLocal(state);
    void probePermission();
    return () => { subscribers.delete(setLocal); };
  }, []);

  return {
    ...local,
    request: requestUserLocation,
    setManual: setManualUserLocation,
    clear: clearUserLocation,
  };
}

/**
 * Display unit, derived from the browser locale once. Separate from the location
 * hook so components that only format a distance don't subscribe to position
 * updates.
 */
export function useDistanceUnit(): DistanceUnit {
  // Start metric so server and first client render agree; correct after mount.
  const [unit, setUnit] = useState<DistanceUnit>('km');
  useEffect(() => {
    setUnit(resolveDistanceUnit(navigator.language));
  }, []);
  return unit;
}
