'use client';

import type { InterestLevel } from '@/lib/interestFilter';

interface InterestFilterProps {
  activeLevels: Set<InterestLevel>;
  onChange: (levels: Set<InterestLevel>) => void;
  availableLevels: InterestLevel[];
  /** Total unfiltered count — when filtering hides some sites, show "X of Y" hint */
  totalCount?: number;
  /** Filtered count */
  filteredCount?: number;
  className?: string;
}

const LEVEL_LABELS: Record<InterestLevel, string> = {
  global: 'Global',
  regional: 'Regional',
  local: 'Local',
  personal: 'Personal',
};

export default function InterestFilter({
  activeLevels,
  onChange,
  availableLevels,
  totalCount,
  filteredCount,
  className,
}: InterestFilterProps) {
  function toggle(level: InterestLevel) {
    if (activeLevels.has(level) && activeLevels.size === 1) return;
    const next = new Set(activeLevels);
    if (next.has(level)) {
      next.delete(level);
    } else {
      next.add(level);
    }
    onChange(next);
  }

  const showHint =
    typeof filteredCount === 'number' &&
    typeof totalCount === 'number' &&
    filteredCount < totalCount;

  return (
    <div className={className}>
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {availableLevels.map((level, idx) => {
          const isActive = activeLevels.has(level);
          const isLast = idx === availableLevels.length - 1;
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggle(level)}
              className={[
                'px-3 min-h-[40px] sm:min-h-[44px] text-[13px] font-medium transition-colors',
                !isLast ? 'border-r border-gray-200' : '',
                isActive
                  ? 'bg-navy-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {LEVEL_LABELS[level]}
            </button>
          );
        })}
      </div>
      {showHint && (
        <p className="text-[11px] text-gray-400 mt-1">
          Showing {filteredCount} of {totalCount} sites
        </p>
      )}
    </div>
  );
}
