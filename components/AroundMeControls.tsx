'use client';

// The three small controls Around Me needs on every surface it appears on:
// the mode bar, the radius ladder, and the sparse-coverage notice. Grouped in one
// file because they are always used together and none is meaningful alone.

import { ChevronLeft, Locate, Info } from 'lucide-react';
import { formatDistance, formatRadius, type DistanceUnit } from '@/lib/geo';
import { RADIUS_LADDER } from '@orbisdei/shared/src/geo';

// ── Mode bar ────────────────────────────────────────────────────────────────

interface AroundMeModeBarProps {
  /** Leaves Around Me and restores the browse view. */
  onBack: () => void;
  /** "Rome, Italy" once reverse geocoding resolves; null while it's in flight. */
  label: string | null;
  accuracyMeters?: number | null;
  isManual?: boolean;
  unit?: DistanceUnit;
  /** Opens the manual place entry so the user can move their search. */
  onChange?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function AroundMeModeBar({
  onBack,
  label,
  accuracyMeters,
  isManual = false,
  unit = 'km',
  onChange,
  size = 'sm',
  className,
}: AroundMeModeBarProps) {
  const titleCls = size === 'md' ? 'text-[15px]' : 'text-base';
  const subtitle = [
    label,
    isManual ? null : accuracyMeters ? `accurate to ${formatDistance(accuracyMeters, unit)}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-white border-b border-gray-200 ${className ?? ''}`}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Leave Around Me"
        className="shrink-0 -ml-1 p-1 text-navy-700"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <span className={`block font-serif font-bold leading-tight text-navy-900 ${titleCls}`}>
          Around Me
        </span>
        <span className="mt-px flex items-center gap-1 text-[11px] text-gray-500">
          <Locate size={9} className="shrink-0" />
          <span className="truncate">{subtitle || 'Locating…'}</span>
        </span>
      </div>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 text-[11px] font-semibold text-navy-700 underline underline-offset-2"
        >
          Change
        </button>
      )}
    </div>
  );
}

// ── Radius ladder + interest-level override ─────────────────────────────────

interface RadiusChipsProps {
  /** The rung actually in force (after any auto-expansion). */
  radiusMeters: number | null;
  onChange: (meters: number | null) => void;
  unit?: DistanceUnit;
  /**
   * Around Me opens all interest levels; this chip makes that visible and
   * reversible. Omit `onRestoreLevels` to hide it.
   */
  onRestoreLevels?: () => void;
  levelsOverridden?: boolean;
  /** `segmented` shows the whole ladder (desktop); `compact` shows one chip. */
  variant?: 'compact' | 'segmented';
  className?: string;
}

export function RadiusChips({
  radiusMeters,
  onChange,
  unit = 'km',
  onRestoreLevels,
  levelsOverridden = false,
  variant = 'compact',
  className,
}: RadiusChipsProps) {
  const label = (meters: number | null) =>
    meters === null ? 'Anywhere' : formatRadius(meters, unit);

  const base =
    'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors';
  const on = 'bg-navy-900 border-navy-900 text-white';
  const off = 'bg-white border-navy-200 text-navy-700 hover:bg-navy-50';

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {variant === 'segmented' ? (
        RADIUS_LADDER.map((rung) => (
          <button
            key={String(rung)}
            type="button"
            onClick={() => onChange(rung)}
            aria-pressed={radiusMeters === rung}
            className={`${base} ${radiusMeters === rung ? on : off}`}
          >
            {label(rung)}
          </button>
        ))
      ) : (
        <button
          type="button"
          onClick={() => {
            // Step to the next rung, wrapping back to the tightest.
            const i = RADIUS_LADDER.findIndex((r) => r === radiusMeters);
            onChange(RADIUS_LADDER[(i + 1) % RADIUS_LADDER.length]);
          }}
          className={`${base} ${on}`}
        >
          {radiusMeters === null ? 'Any distance' : `Within ${label(radiusMeters)}`}
        </button>
      )}

      {onRestoreLevels && levelsOverridden && (
        <button
          type="button"
          onClick={onRestoreLevels}
          title="Around Me shows every interest level. Tap to restore your own filter."
          className={`${base} border-[#f0dda0] bg-[#fef8e0] text-[#8a6d0b] hover:bg-[#fdf6d1]`}
        >
          All levels
        </button>
      )}
    </div>
  );
}

// ── Sparse-coverage notice ──────────────────────────────────────────────────

interface SparseCoverageNoticeProps {
  /** The radius the user asked for, which came back too thin. */
  requestedRadius: number | null;
  unit?: DistanceUnit;
  className?: string;
}

/**
 * With the catalog weighted heavily toward Europe, most of the world is a sparse
 * region. Being explicit about it is what keeps trust: silently showing something
 * 357 miles away looks like a bug, whereas "nothing within 100 km" is useful
 * information about the catalog.
 */
export function SparseCoverageNotice({
  requestedRadius,
  unit = 'km',
  className,
}: SparseCoverageNoticeProps) {
  if (requestedRadius === null) return null;
  return (
    <div
      className={`flex gap-2.5 rounded-lg border border-[#f5e6c8] bg-[#fffcf5] px-3 py-2.5 ${className ?? ''}`}
    >
      <Info size={15} className="mt-px shrink-0 text-[#a0700d]" />
      <div>
        <p className="text-[12px] font-semibold text-[#7c5a12]">
          Nothing within {formatRadius(requestedRadius, unit)} of you
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#8a6d3b]">
          Coverage is still thin here. Showing the nearest sites at any distance instead.
        </p>
      </div>
    </div>
  );
}
