'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Download, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import MapViewDynamic from '@/components/MapViewDynamic';
import { haversineMeters, distanceBadgeClass, formatDistance, COORDINATE_SOURCE_PIN_LABELS } from '@/lib/geo';
import type { CoordinateCandidate } from '@/lib/types';

interface CoordinateVerificationProps {
  /**
   * Existing site id. Omit for a site that doesn't exist yet (new-site
   * create flows — Contribute, AI import, a 'create' pending_submissions row
   * in the approval queue): candidate caching and "Mark verified" both
   * require a real `sites` row, so they're unavailable until the site is
   * actually created. "Fetch external coords" still works without one — it
   * just runs the lookup ad hoc instead of caching it.
   */
  siteId?: string | null;
  name: string;
  municipality: string;
  country: string;
  latitude: string;
  longitude: string;
  onCoordinatesChange: (lat: string, lon: string) => void;
  /** Current sites.coordinates_verified value, when known (siteId only). */
  initialVerified?: boolean;
  /** Fires after "Mark verified" succeeds, so a caller tracking its own site record can sync. */
  onVerifiedChange?: (verified: boolean) => void;
  disabled?: boolean;
  /**
   * Lift candidate state up to a parent instead of owning it internally —
   * for a caller that unmounts/remounts this component (e.g. an admin table
   * row whose accordion collapses) and wants fetched candidates to survive
   * that instead of refetching every time it's reopened. Pass both together;
   * `candidates: null` means "not fetched yet". Omit both to manage state
   * internally — fine for a component that stays mounted for the page's
   * lifetime, like the Contribute/Edit forms.
   */
  candidates?: CoordinateCandidate[] | null;
  onCandidatesLoaded?: (candidates: CoordinateCandidate[]) => void;
  /** Pixel height of the embedded map. Default fits a compact form; admin's wider layout passes more. */
  mapHeight?: number;
}

export function CoordinateVerification({
  siteId,
  name,
  municipality,
  country,
  latitude,
  longitude,
  onCoordinatesChange,
  initialVerified = false,
  onVerifiedChange,
  disabled = false,
  candidates: controlledCandidates,
  onCandidatesLoaded,
  mapHeight = 260,
}: CoordinateVerificationProps) {
  const isControlled = controlledCandidates !== undefined;
  const [internalCandidates, setInternalCandidates] = useState<CoordinateCandidate[]>([]);
  const candidates = isControlled ? controlledCandidates ?? [] : internalCandidates;
  function setCandidates(next: CoordinateCandidate[]) {
    if (isControlled) onCandidatesLoaded?.(next);
    else setInternalCandidates(next);
  }

  const [loadingCandidates, setLoadingCandidates] = useState(
    isControlled ? controlledCandidates === null : !!siteId
  );
  const [fetching, setFetching] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [markingVerified, setMarkingVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached candidates for an existing site on mount. Skipped when the
  // parent already supplied a (non-null) controlled cache, or there's no
  // siteId yet — a brand-new site has nothing cached; "Fetch external
  // coords" is the only way to populate candidates before it's created.
  useEffect(() => {
    if (isControlled && controlledCandidates !== null) {
      setLoadingCandidates(false);
      return;
    }
    if (!siteId) {
      if (!isControlled) setInternalCandidates([]);
      setLoadingCandidates(false);
      return;
    }
    let cancelled = false;
    setLoadingCandidates(true);
    createClient()
      .from('coordinate_candidates')
      .select('id, site_id, source, latitude, longitude, fetched_at')
      .eq('site_id', siteId)
      .then(({ data }) => {
        if (cancelled) return;
        setCandidates((data ?? []) as CoordinateCandidate[]);
        setLoadingCandidates(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, isControlled, controlledCandidates === null]);

  useEffect(() => {
    setVerified(initialVerified);
  }, [initialVerified, siteId]);

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);
  const hasCurrent = !isNaN(latNum) && !isNaN(lonNum);

  const pins = useMemo(() => {
    const list: { id: string; name: string; latitude: number; longitude: number; short_description: string }[] = [];
    if (hasCurrent) {
      list.push({ id: 'current', name: 'Current', latitude: latNum, longitude: lonNum, short_description: 'Current coordinates' });
    }
    for (const c of candidates) {
      list.push({
        id: c.source,
        name: c.source === 'google_places' ? 'Google Places' : c.source === 'opencage' ? 'OpenCage' : 'Nominatim',
        latitude: c.latitude,
        longitude: c.longitude,
        short_description: c.source,
      });
    }
    return list;
  }, [hasCurrent, latNum, lonNum, candidates]);

  async function handleFetch() {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/fetch-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          siteId ? { site_ids: [siteId] } : { query: { name, municipality, country } }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      const result = (data.results as { site_id: string | null; candidates: CoordinateCandidate[] }[])?.[0];
      if (result?.candidates?.length) {
        setCandidates(result.candidates as CoordinateCandidate[]);
      } else {
        setError('No results returned — check API key configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setFetching(false);
    }
  }

  async function handleMarkVerified() {
    if (!siteId) return;
    setMarkingVerified(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('sites')
      .update({ coordinates_verified: true })
      .eq('id', siteId);
    setMarkingVerified(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setVerified(true);
    onVerifiedChange?.(true);
  }

  const center: [number, number] = hasCurrent
    ? [latNum, lonNum]
    : pins[0]
    ? [pins[0].latitude, pins[0].longitude]
    : [0, 0];

  return (
    <div className="flex flex-col gap-3">
      {loadingCandidates && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading coordinate candidates…
        </p>
      )}

      {!loadingCandidates && (
        <div className="flex flex-wrap gap-2">
          <div className="border border-gray-200 rounded-lg p-2.5 bg-white min-w-[140px]">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Current</div>
            <div className="font-mono text-xs text-gray-700">{hasCurrent ? latNum.toFixed(6) : '—'}</div>
            <div className="font-mono text-xs text-gray-700">{hasCurrent ? lonNum.toFixed(6) : '—'}</div>
          </div>

          {candidates.map((c) => {
            const dist = hasCurrent ? haversineMeters(latNum, lonNum, c.latitude, c.longitude) : null;
            const isActive = hasCurrent && latNum === c.latitude && lonNum === c.longitude;
            return (
              <button
                key={c.source}
                type="button"
                onClick={() => onCoordinatesChange(String(c.latitude), String(c.longitude))}
                disabled={disabled}
                title="Click to use these coordinates"
                className={`border rounded-lg p-2.5 bg-white min-w-[140px] text-left transition-colors hover:border-navy-400 hover:shadow-xs disabled:opacity-60 ${
                  isActive ? 'border-navy-500 ring-1 ring-navy-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {c.source === 'google_places' ? 'Google' : c.source === 'opencage' ? 'OpenCage' : 'Nominatim'}
                  </div>
                  {dist !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${distanceBadgeClass(dist)}`}>
                      {formatDistance(dist)}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-gray-700">{c.latitude.toFixed(6)}</div>
                <div className="font-mono text-xs text-gray-700">{c.longitude.toFixed(6)}</div>
              </button>
            );
          })}

          {candidates.length === 0 && (
            <p className="text-xs text-gray-400 self-center">No cached candidates — fetch to compare.</p>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {candidates.length > 0 && hasCurrent && (() => {
          const best = [...candidates].sort(
            (a, b) =>
              haversineMeters(latNum, lonNum, a.latitude, a.longitude) -
              haversineMeters(latNum, lonNum, b.latitude, b.longitude)
          )[0];
          return (
            <button
              type="button"
              onClick={() => onCoordinatesChange(String(best.latitude), String(best.longitude))}
              disabled={disabled}
              className="bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-60"
            >
              Accept best match
            </button>
          );
        })()}
        <button
          type="button"
          onClick={handleFetch}
          disabled={fetching || disabled || !name.trim()}
          className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
        >
          {fetching ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Fetch external coords
        </button>
        {siteId && !verified && (
          <button
            type="button"
            onClick={handleMarkVerified}
            disabled={markingVerified || disabled}
            className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {markingVerified ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Mark verified
          </button>
        )}
        {siteId && verified && (
          <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
            <CheckCircle2 size={12} /> Coordinates verified
          </span>
        )}
      </div>

      {pins.length > 0 ? (
        <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: mapHeight }}>
          <MapViewDynamic
            pins={pins}
            highlightedSiteId="current"
            pinLabels={COORDINATE_SOURCE_PIN_LABELS}
            initialFitBounds={pins.length > 1}
            initialCenter={center}
            initialZoom={14}
            minZoom={4}
          />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400"
          style={{ height: mapHeight }}
        >
          No coordinates set
        </div>
      )}
    </div>
  );
}
