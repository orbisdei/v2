'use client';

// The "go sideways" axis: which topics exist inside the geography (or radius, or
// search result) you are already looking at, and how many sites each covers.
//
// These are deliberately NOT TagPill links. A link to /tag/joan-arc throws the
// place away, and the intersection of place × topic is the entire point of the
// feature — so selecting a facet filters in place and writes ?topics= instead.
// The blue ChildTagPills above it keep navigating; the visual difference between
// the two rows is load-bearing, which is why both carry an eyebrow label.

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import TopicFacetSheet from './TopicFacetSheet';
import { splitFacets, type TopicFacet } from '@/lib/topicFacets';

interface TopicFacetRowProps {
  facets: TopicFacet[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  /** Sites matching the current selection — shown on the sheet's confirm button. */
  resultCount: number;
  /** Eyebrow label; also the sheet title. */
  label?: string;
  /** Short explanation beside the label. Omit on tight layouts. */
  hint?: string;
  /** How many pills before collapsing into the overflow trigger. */
  inlineLimit?: number;
  className?: string;
}

export default function TopicFacetRow({
  facets,
  selected,
  onToggle,
  onClear,
  resultCount,
  label = 'Topics',
  hint,
  inlineLimit,
  className,
}: TopicFacetRowProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (facets.length === 0) return null;

  const { inline, hasOverflow } = splitFacets(facets, inlineLimit, selected);

  return (
    <div className={className}>
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-2 flex-wrap">
        {label}
        {hint && (
          <span className="font-normal normal-case tracking-normal text-gray-400">{hint}</span>
        )}
      </h2>

      <div className="flex flex-wrap gap-1.5 items-center">
        {inline.map((facet) => {
          const on = selected.has(facet.id);
          return (
            <button
              key={facet.id}
              type="button"
              onClick={() => onToggle(facet.id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-400 ${
                on
                  ? 'bg-navy-900 border-navy-900 text-white'
                  : 'bg-white border-navy-200 text-navy-700 hover:bg-navy-50'
              }`}
            >
              {facet.name}
              <span className={`text-[11px] tabular-nums ${on ? 'text-white/60' : 'text-gray-500'}`}>
                {facet.count}
              </span>
              {on && <X size={10} strokeWidth={3} className="opacity-70" />}
            </button>
          );
        })}

        {hasOverflow && (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center shrink-0 whitespace-nowrap rounded-full border border-dashed border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-navy-300 hover:text-navy-700 transition-colors"
          >
            All {facets.length} topics
          </button>
        )}

        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center shrink-0 rounded-full px-1.5 py-1 text-xs font-medium text-navy-700 underline underline-offset-2 hover:text-navy-500"
          >
            Clear
          </button>
        )}
      </div>

      <TopicFacetSheet
        facets={facets}
        selected={selected}
        onToggle={onToggle}
        onClear={onClear}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        anchorRef={triggerRef}
        title={label}
        resultCount={resultCount}
      />
    </div>
  );
}
