'use client';

// Multi-select overflow picker for topic facets: desktop dropdown anchored to the
// trigger, mobile bottom sheet. The positioning / outside-click / Escape
// mechanics are deliberately the same as TagOverflowPopover — but that component
// renders TagPill *links* for navigation, and this one owns checkbox selection
// state, a filter field and a live result count, so they are different
// components rather than one over-configured one.

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ChevronDown } from 'lucide-react';
import SearchInput from './SearchInput';
import { MIN_INLINE_FACET_COUNT, type TopicFacet } from '@/lib/topicFacets';

interface TopicFacetSheetProps {
  facets: TopicFacet[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** e.g. "Topics in France" / "Topics near you". */
  title: string;
  /** Sites matching the current selection — shown on the confirm button. */
  resultCount: number;
}

export default function TopicFacetSheet({
  facets,
  selected,
  onToggle,
  onClear,
  isOpen,
  onClose,
  anchorRef,
  title,
  resultCount,
}: TopicFacetSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [showSingles, setShowSingles] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right?: number }>({});
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reset the transient view state each time it opens, so reopening never
  // inherits a stale filter string from last time.
  useEffect(() => {
    if (isOpen) { setQuery(''); setShowSingles(false); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    function computePos() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 300) {
        setPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right });
      } else {
        setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    }
    computePos();
    window.addEventListener('scroll', computePos, true);
    window.addEventListener('resize', computePos);
    return () => {
      window.removeEventListener('scroll', computePos, true);
      window.removeEventListener('resize', computePos);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || contentRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, onClose, anchorRef]);

  const q = query.trim().toLowerCase();

  const { visible, hiddenSingles } = useMemo(() => {
    const matching = q
      ? facets.filter((f) => f.name.toLowerCase().includes(q))
      : facets;
    // Searching cuts through the singles collapse — if you typed a name you want
    // to see it whether or not it has two sites.
    if (q || showSingles) return { visible: matching, hiddenSingles: 0 };
    const multi = matching.filter((f) => f.count >= MIN_INLINE_FACET_COUNT || selected.has(f.id));
    return { visible: multi, hiddenSingles: matching.length - multi.length };
  }, [facets, q, showSingles, selected]);

  if (!isOpen || !mounted) return null;

  const rows = (
    <div className="flex flex-col">
      {visible.map((facet) => {
        const on = selected.has(facet.id);
        return (
          <button
            key={facet.id}
            type="button"
            onClick={() => onToggle(facet.id)}
            aria-pressed={on}
            className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0 text-left min-h-[40px] focus-visible:outline-2 focus-visible:outline-navy-400"
          >
            <span
              className={`shrink-0 w-[17px] h-[17px] rounded-[4px] border-[1.5px] flex items-center justify-center transition-colors ${
                on ? 'bg-navy-900 border-navy-900 text-white' : 'border-gray-300'
              }`}
            >
              {on && <Check size={11} strokeWidth={3.4} />}
            </span>
            <span className="flex-1 min-w-0 text-[13px] text-navy-900 truncate">{facet.name}</span>
            <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{facet.count}</span>
          </button>
        );
      })}

      {visible.length === 0 && (
        <p className="py-4 text-center text-[12px] text-gray-500">
          No topics match &ldquo;{query}&rdquo;
        </p>
      )}

      {hiddenSingles > 0 && (
        <button
          type="button"
          onClick={() => setShowSingles(true)}
          className="flex items-center gap-2 pt-3 pb-1 text-[12px] text-gray-500 hover:text-navy-700 min-h-[40px]"
        >
          <ChevronDown size={13} />
          Show {hiddenSingles} topic{hiddenSingles !== 1 && 's'} with one site
        </button>
      )}
    </div>
  );

  const footer = (
    <div className="flex gap-2 pt-3 border-t border-gray-100">
      <button
        type="button"
        onClick={onClear}
        disabled={selected.size === 0}
        className="w-24 min-h-[44px] rounded-lg border border-gray-200 text-[13px] font-medium text-navy-700 disabled:text-gray-300 disabled:border-gray-100"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 min-h-[44px] rounded-lg bg-navy-900 text-white text-[13px] font-semibold"
      >
        Show {resultCount} site{resultCount !== 1 && 's'}
      </button>
    </div>
  );

  return createPortal(
    <div ref={contentRef}>
      {/* Desktop: dropdown anchored to the trigger */}
      <div
        className="hidden md:flex fixed w-80 max-h-[70vh] flex-col bg-white rounded-xl border border-gray-200 shadow-lg z-9999 px-4 py-3"
        style={pos}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-semibold text-navy-900">{title}</span>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-[11px] text-gray-500">{selected.size} selected</span>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1">
              <X size={16} />
            </button>
          </div>
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Filter ${facets.length} topics…`}
          ariaLabel="Filter topics"
          className="mb-1"
        />
        <div className="flex-1 min-h-0 overflow-y-auto">{rows}</div>
        {footer}
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <div className="fixed inset-0 bg-black/40 z-9998" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 max-h-[85dvh] z-9999 bg-white rounded-t-2xl shadow-xl flex flex-col">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
            <span className="text-[15px] font-semibold text-navy-900">{title}</span>
            {selected.size > 0 && (
              <span className="text-[11px] text-gray-500">{selected.size} selected</span>
            )}
          </div>
          <div className="px-4 shrink-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={`Filter ${facets.length} topics…`}
              ariaLabel="Filter topics"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4">{rows}</div>
          <div className="px-4 pb-4 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
            {footer}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
