'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronRight } from 'lucide-react';
import SiteThumbnailActions from './SiteThumbnailActions';
import SiteTextBlock from './SiteTextBlock';
import TagOverflowPopover from './TagOverflowPopover';
import TagPill from './TagPill';
import { getCountryName } from '@/lib/countries';
import type { Site, Tag } from '@/lib/types';

type Size = 'sm' | 'md';

interface SiteCardProps {
  site: Site;
  tags: Tag[];
  size?: Size;
  /** When provided, shows an X close button overlaid top-right. */
  onClose?: () => void;
}

const GAP_CLS: Record<Size, string> = { sm: 'gap-2.5', md: 'gap-3.5' };

const THUMB_COL_CLS: Record<Size, string> = { sm: 'w-24', md: 'w-32' };
const THUMB_BOX_CLS: Record<Size, string> = { sm: 'w-24 h-20', md: 'w-32 h-28' };

export default function SiteCard({ site, tags, size = 'sm', onClose }: SiteCardProps) {
  const locationParts = [
    site.municipality,
    site.country ? getCountryName(site.country) : undefined,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  const topicTags = tags.filter(
    (t) => site.tag_ids.includes(t.id) && (t.type === 'topic' || !t.type)
  );

  const siteHref = `/site/${site.id}`;

  return (
    <div className="relative">
      {/* Background card link — covers the entire card area */}
      <Link
        href={siteHref}
        aria-label={site.name}
        className="absolute inset-0 rounded-[inherit] z-0"
      />

      {/* Close X — z-20 so it's always above everything */}
      {onClose && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
          aria-label="Close preview"
          className="absolute top-0 right-0 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-20"
          style={{ width: 22, height: 22 }}
        >
          <X size={11} className="text-gray-500" />
        </button>
      )}

      {/* Visual content — pointer-events-none so clicks fall through to the card link */}
      <div className={`relative flex ${GAP_CLS[size]} pr-5 z-10 pointer-events-none`}>
        {/* Thumbnail column */}
        <div className={`shrink-0 ${THUMB_COL_CLS[size]}`}>
          <div className={`relative rounded-t-lg overflow-hidden bg-navy-100 ${THUMB_BOX_CLS[size]}`}>
            {site.images[0] ? (
              <Image
                src={site.images[0].url}
                alt={site.name}
                fill
                className="object-cover"
                sizes={size === 'md' ? '128px' : '96px'}
              />
            ) : null}
          </div>
          {/* Re-enable pointer events for interactive action buttons */}
          <div className="pointer-events-auto relative z-10">
            <SiteThumbnailActions
              siteId={site.id}
              siteName={site.name}
              thumbnailUrl={site.images[0]?.url}
              googleMapsUrl={site.google_maps_url}
            />
          </div>
        </div>

        {/* Text + tag chips */}
        <div className="flex-1 min-w-0">
          <SiteTextBlock
            name={site.name}
            location={location}
            description={site.short_description}
            size={size}
            className={onClose ? 'pr-6' : ''}
          />
          {topicTags.length > 0 && (
            size === 'md'
              ? (
                <div className="pointer-events-auto relative z-10">
                  <MdTagRow tags={topicTags} />
                </div>
              )
              : (
                <div className="flex gap-1.5 mt-1 overflow-x-auto scrollbar-hide pointer-events-auto relative z-10">
                  {topicTags.map((tag) => (
                    <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="topic" size="sm">
                      {tag.name}
                    </TagPill>
                  ))}
                </div>
              )
          )}
        </div>
      </div>

      {/* Chevron — purely visual affordance */}
      <ChevronRight
        size={size === 'md' ? 18 : 16}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none z-10"
        aria-hidden="true"
      />
    </div>
  );
}

// Single-row tag renderer for size='md' with ResizeObserver-driven overflow.
// Renders all tags off-screen for measurement, then shows as many as fit alongside a "+N more" trigger.
//
// MEASUREMENT_CLS must visually match TagPill variant="topic" size="md" exactly so off-screen
// widths equal the rendered widths. If you change TagPill md styling, update this string too.
const MEASUREMENT_CLS =
  'inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-medium border bg-white text-navy-700 border-navy-200 px-2.5 py-1 text-xs';

const TRIGGER_CLS =
  'inline-flex items-center shrink-0 whitespace-nowrap rounded-full font-medium border bg-white text-navy-700 border-navy-200 hover:bg-navy-50 transition-colors px-2.5 py-1 text-xs';

function MdTagRow({ tags }: { tags: Tag[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const GAP = 8; // gap-2 = 8px
  const TRIGGER_ESTIMATE = 80; // conservative width budget for "+N more" pill

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function compute() {
      if (!container) return;
      const containerWidth = container.offsetWidth;
      const n = tags.length;
      const widths = measureRefs.current.slice(0, n).map(el => el?.offsetWidth ?? 0);

      // Check if all pills fit without a trigger
      const totalAll = widths.reduce((s, w, i) => s + w + (i > 0 ? GAP : 0), 0);
      if (totalAll <= containerWidth) {
        setVisibleCount(n);
        return;
      }

      // Find max k pills that fit alongside the trigger
      let accumulated = 0;
      let bestCount = 0;
      for (let i = 0; i < n; i++) {
        const addThis = (i > 0 ? GAP : 0) + widths[i];
        if (accumulated + addThis + GAP + TRIGGER_ESTIMATE <= containerWidth) {
          accumulated += addThis;
          bestCount = i + 1;
        } else {
          break;
        }
      }

      setVisibleCount(bestCount); // 0 means only the trigger is shown
    }

    compute();
    const ro = new ResizeObserver(() => requestAnimationFrame(compute));
    ro.observe(container);
    return () => ro.disconnect();
  }, [tags]); // re-run whenever tag set changes

  const visibleTags = tags.slice(0, visibleCount);
  const overflowTags = tags.slice(visibleCount);

  return (
    <div className="mt-2">
      {/* Off-screen measurement row — always renders all pills for sizing, never visible */}
      <div
        className="fixed flex gap-2 flex-nowrap pointer-events-none"
        style={{ top: -9999, left: 0, visibility: 'hidden', zIndex: -1 }}
        aria-hidden="true"
      >
        {tags.map((tag, i) => (
          <div
            key={tag.id}
            ref={el => { measureRefs.current[i] = el; }}
            className={MEASUREMENT_CLS}
          >
            {tag.name}
          </div>
        ))}
      </div>

      {/* Visible single-row container */}
      <div ref={containerRef} className="flex gap-2 flex-nowrap overflow-hidden">
        {visibleTags.map(tag => (
          <TagPill key={tag.id} href={`/tag/${tag.id}`} variant="topic" size="md">
            {tag.name}
          </TagPill>
        ))}
        {overflowTags.length > 0 && (
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPopoverOpen(true); }}
            className={TRIGGER_CLS}
          >
            +{overflowTags.length} more
          </button>
        )}
      </div>

      <TagOverflowPopover
        tags={overflowTags}
        isOpen={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        anchorRef={triggerRef}
      />
    </div>
  );
}
