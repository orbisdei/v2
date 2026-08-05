'use client';

// The desktop Around Me panel. Swapped in for <Sidebar> while the mode is on,
// rather than bolting a dozen conditional props onto Sidebar itself.
//
// The key desktop difference from mobile: there is no map/list toggle to switch,
// because the sidebar is already a permanent list beside a permanent map. So
// Around Me is a SORT here, not a mode change — search stays where it was, the
// map stays where it was, and only the sidebar's contents change.

import type { Site } from '@/lib/types';
import type { DistanceUnit, LocationSuggestion, WithDistance } from '@/lib/geo';
import type { TopicFacet } from '@/lib/topicFacets';
import type { LocationStatus } from '@/lib/hooks/useUserLocation';
import { cfImage } from '@/lib/imageUrl';
import { AroundMeModeBar, SparseCoverageNotice } from './AroundMeControls';
import TopicFacetRow from './TopicFacetRow';
import LocationFallbackPanel from './LocationFallbackPanel';
import DistanceBadge from './DistanceBadge';
import SiteDescription from './SiteDescription';
import SiteRowActions from './SiteRowActions';
import { getCountryName } from '@/lib/countries';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface AroundMeSidebarProps {
  results: WithDistance<Site>[];
  /** Total in-radius before topic facets narrowed it — for "9 of 26". */
  totalInRadius: number;
  unit: DistanceUnit;

  status: LocationStatus;
  locationLabel: string | null;
  accuracyMeters: number | null;
  isManual: boolean;
  errorMessage: string | null;

  /** Only needed for the sparse-coverage notice — the radius ladder itself lives
   *  on the map on desktop, alongside the interest-level override. */
  requestedRadius: number | null;
  expanded: boolean;

  facets: TopicFacet[];
  selectedTopics: Set<string>;
  onToggleTopic: (id: string) => void;
  onClearTopics: () => void;

  suggestions: LocationSuggestion[];
  onPickPlace: (lat: number, lng: number, label: string) => void;
  onRetry: () => void;
  onBack: () => void;
  onChangePlace: () => void;

  onSiteHover?: (siteId: string | null) => void;
}

export default function AroundMeSidebar({
  results,
  totalInRadius,
  unit,
  status,
  locationLabel,
  accuracyMeters,
  isManual,
  errorMessage,
  requestedRadius,
  expanded,
  facets,
  selectedTopics,
  onToggleTopic,
  onClearTopics,
  suggestions,
  onPickPlace,
  onRetry,
  onBack,
  onChangePlace,
  onSiteHover,
}: AroundMeSidebarProps) {
  const facetsActive = selectedTopics.size > 0;

  return (
    <aside className="w-full md:w-[400px] lg:w-[420px] bg-white border-r border-gray-200 flex flex-col relative shrink-0 z-10">
      <AroundMeModeBar
        onBack={onBack}
        label={locationLabel}
        accuracyMeters={accuracyMeters}
        isManual={isManual}
        unit={unit}
        onChange={status === 'ready' ? onChangePlace : undefined}
        size="md"
        className="shrink-0"
      />

      {status === 'denied' || status === 'unavailable' ? (
        <div className="flex-1 overflow-y-auto sidebar-scroll px-3">
          <LocationFallbackPanel
            reason={status === 'denied' ? 'denied' : 'unavailable'}
            message={errorMessage}
            suggestions={suggestions}
            onPick={onPickPlace}
            onRetry={onRetry}
          />
        </div>
      ) : status !== 'ready' ? (
        <div className="flex flex-1 items-center justify-center text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="shrink-0 px-3 pt-3 pb-2 flex flex-col gap-2.5">
            {expanded && <SparseCoverageNotice requestedRadius={requestedRadius} unit={unit} />}
            <TopicFacetRow
              facets={facets}
              selected={selectedTopics}
              onToggle={onToggleTopic}
              onClear={onClearTopics}
              resultCount={results.length}
              label="Topics near you"
              inlineLimit={4}
            />
          </div>

          <div className="shrink-0 border-y border-gray-100 px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {facetsActive
                ? `${results.length} of ${totalInRadius} sites`
                : `${results.length} site${results.length !== 1 ? 's' : ''}, nearest first`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto sidebar-scroll">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                No sites match these topics near you.
              </p>
            ) : (
              <div className="p-2">
                {results.map(({ site, distanceMeters }, idx) => (
                  <NearbyRow
                    key={site.id}
                    site={site}
                    rank={idx + 1}
                    distanceMeters={distanceMeters}
                    unit={unit}
                    onSiteHover={onSiteHover}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/**
 * Denser than SiteListItem: the rank is gold (matching the numbered map pins)
 * and the distance leads the location line, so the eye can run down the column of
 * distances without reading anything else.
 */
function NearbyRow({
  site,
  rank,
  distanceMeters,
  unit,
  onSiteHover,
}: {
  site: Site;
  rank: number;
  distanceMeters: number;
  unit: DistanceUnit;
  onSiteHover?: (id: string | null) => void;
}) {
  const location = [site.municipality, site.country ? getCountryName(site.country) : undefined]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className="group flex items-start gap-2.5 rounded-lg border border-transparent p-2 transition-all hover:border-gray-200 hover:bg-white hover:shadow-xs"
      onMouseEnter={() => onSiteHover?.(site.id)}
      onMouseLeave={() => onSiteHover?.(null)}
    >
      <span className="w-4 shrink-0 pt-1 text-center text-xs font-bold tabular-nums text-gold-600">
        {rank}
      </span>

      <Link href={`/site/${site.id}`} prefetch={false} className="flex min-w-0 flex-1 items-start gap-2.5">
        {site.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cfImage(site.images[0].url, 160)}
            alt={site.name}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-md object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-md bg-navy-100" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[13px] font-semibold leading-tight text-navy-900 group-hover:text-navy-600">
            {site.name}
          </p>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
            <DistanceBadge meters={distanceMeters} unit={unit} />
            <span className="truncate">{location}</span>
          </span>
          <SiteDescription
            text={site.short_description}
            className="mt-0.5 line-clamp-2 text-[11px] text-gray-500"
          />
        </div>
      </Link>

      <div className="shrink-0 pt-1">
        <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
      </div>
    </div>
  );
}
