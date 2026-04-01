'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Map, X, Search, Pencil, ExternalLink } from 'lucide-react';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteRowActions from '@/components/SiteRowActions';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import { getCountryName } from '@/lib/countries';
import { formatRichText } from '@/lib/richText';
import type { Site, Tag, MapPin, LinkEntry } from '@/lib/types';

interface TagPageClientProps {
  tag: Tag;
  sites: Site[];
  pins: MapPin[];
  allTags: Tag[];
  creatorName: string | null;
  childTags: (Tag & { site_count: number })[];
  parentTag: Tag | null;
  grandparentTag: Tag | null;
  displayDescription?: string;
  heroImageUrl?: string | null;
  heroImageAttribution?: string | null;
  heroSiteName?: string | null;
  heroSiteId?: string | null;
  userRole?: string | null;
  userId?: string | null;
  hasPendingEdit?: boolean;
  tagLinks?: LinkEntry[];
}

const CHILD_TAG_COLLAPSE_THRESHOLD = 8;

export default function TagPageClient({
  tag, sites, pins, allTags, creatorName, childTags, parentTag, grandparentTag,
  displayDescription, heroImageUrl, heroImageAttribution, heroSiteName, heroSiteId, userRole, hasPendingEdit, tagLinks = [],
}: TagPageClientProps) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const popup = useLeafletPopupCard(sites, allTags);

  // Clear popup state when fullscreen map closes
  useEffect(() => {
    if (!mapFullscreen) popup.clear();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFullscreen]);

  const mapSearchResults = useMemo(() => {
    const q = mapSearchQuery.toLowerCase().trim();
    if (!q) return null;
    return sites
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.short_description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mapSearchQuery, sites]);

  const isLocation = ['country', 'region', 'municipality'].includes(tag.type ?? '');
  const isTopic = !isLocation;
  const canEdit = userRole === 'administrator' || (userRole === 'contributor' && isTopic);

  // Hero image only applies to location tags; topic tags use image_url inline (floated)
  const resolvedHeroImage = isLocation ? (tag.image_url ?? heroImageUrl ?? null) : null;
  const resolvedHeroAttribution = tag.image_url ? null : (heroImageAttribution ?? null);
  const resolvedHeroSiteName = tag.image_url ? null : (heroSiteName ?? null);
  const resolvedHeroSiteId = tag.image_url ? null : (heroSiteId ?? null);

  // Child tag split + sort by site_count desc
  const sortedChildTags = useMemo(
    () => [...childTags].sort((a, b) => b.site_count - a.site_count),
    [childTags]
  );
  const regions = sortedChildTags.filter((t) => t.type === 'region');
  const municipalities = sortedChildTags.filter((t) => t.type === 'municipality');

  const visibleRegions = showAllRegions ? regions : regions.slice(0, CHILD_TAG_COLLAPSE_THRESHOLD);
  const visibleCities = showAllCities ? municipalities : municipalities.slice(0, CHILD_TAG_COLLAPSE_THRESHOLD);

  // ── Shared sub-components ──────────────────────────────────────────────────

  function HeroBanner({ height, textSize }: { height: string; textSize: string }) {
    if (!resolvedHeroImage) return null;
    return (
      <div className="relative overflow-hidden bg-gray-200 shrink-0" style={{ height }}>
        <img
          src={resolvedHeroImage}
          alt={tag.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        {/* Back link */}
        <div className="absolute top-3 left-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] text-white font-medium drop-shadow"
          >
            <ArrowLeft size={14} />
            Back to search
          </Link>
        </div>
        {/* Tag name bottom-left */}
        <div className="absolute bottom-3 left-3 right-20">
          <h1 className={`font-serif ${textSize} font-medium text-white leading-snug drop-shadow`}>
            {tag.name}
          </h1>
        </div>
        {/* Attribution bottom-right */}
        {(resolvedHeroSiteName || resolvedHeroAttribution) && (
          <div className="absolute bottom-3 right-3 text-right">
            {resolvedHeroSiteName && resolvedHeroSiteId && (
              <Link
                href={`/site/${resolvedHeroSiteId}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-white/80 hover:text-white drop-shadow"
              >
                {resolvedHeroSiteName}
                <ChevronRight size={10} />
              </Link>
            )}
            {resolvedHeroAttribution && (
              <p className="text-[10px] text-white/60 drop-shadow mt-0.5">
                {resolvedHeroAttribution}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function ChildTagPills({ mobile }: { mobile: boolean }) {
    if (sortedChildTags.length === 0) return null;
    const pillClass = mobile
      ? 'px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors'
      : 'px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors';
    const headingClass = mobile
      ? 'text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5'
      : 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2';
    const toggleBtnClass = mobile
      ? 'mt-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium'
      : 'mt-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium';

    return (
      <>
        {regions.length > 0 && (
          <div className={mobile ? 'mb-2' : 'mb-3'}>
            <h3 className={headingClass}>Regions</h3>
            <div className={`flex flex-wrap ${mobile ? 'gap-1' : 'gap-1.5'}`}>
              {visibleRegions.map((child) => (
                <Link key={child.id} href={`/tag/${child.id}`} className={pillClass}>
                  {child.name}
                  <span className="ml-1 text-blue-400">({child.site_count})</span>
                </Link>
              ))}
            </div>
            {regions.length > CHILD_TAG_COLLAPSE_THRESHOLD && (
              <button
                type="button"
                onClick={() => setShowAllRegions((v) => !v)}
                className={toggleBtnClass}
              >
                {showAllRegions ? 'Show fewer' : `Show all ${regions.length} regions`}
              </button>
            )}
          </div>
        )}
        {municipalities.length > 0 && (
          <div className={mobile ? 'mb-2' : undefined}>
            <h3 className={headingClass}>Cities</h3>
            <div className={`flex flex-wrap ${mobile ? 'gap-1' : 'gap-1.5'}`}>
              {visibleCities.map((child) => (
                <Link key={child.id} href={`/tag/${child.id}`} className={pillClass}>
                  {child.name}
                  <span className="ml-1 text-blue-400">({child.site_count})</span>
                </Link>
              ))}
            </div>
            {municipalities.length > CHILD_TAG_COLLAPSE_THRESHOLD && (
              <button
                type="button"
                onClick={() => setShowAllCities((v) => !v)}
                className={toggleBtnClass}
              >
                {showAllCities ? 'Show fewer' : `Show all ${municipalities.length} cities`}
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  function SiteLocationSubtitle({ site }: { site: Site }) {
    const countryName = site.country ? getCountryName(site.country) : '';
    const parts = [site.municipality, countryName].filter(Boolean);
    if (parts.length === 0) return null;
    return <p className="text-[11px] text-gray-500 mt-0">{parts.join(', ')}</p>;
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── MOBILE layout (below md) ── */}
      <div className="md:hidden flex flex-col h-[calc(100dvh-56px)]">

        {/* ── STICKY TOP SECTION ── */}
        <div className="shrink-0 bg-white">

          {/* Hero banner (location tags only) or plain back link + title */}
          {isLocation && resolvedHeroImage ? (
            <>
              <HeroBanner height="140px" textSize="text-[21px]" />
              {canEdit && (
                <div className="px-[14px] pt-[8px] flex items-center justify-end gap-2">
                  {hasPendingEdit && (
                    <span className="text-[11px] text-amber-700 font-medium">Pending edit</span>
                  )}
                  <Link
                    href={`/tag/${tag.id}/edit`}
                    className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
                  >
                    <Pencil size={13} />
                    Edit tag
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="px-[14px] pt-[10px]">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
                >
                  <ArrowLeft size={14} />
                  Back to search
                </Link>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {hasPendingEdit && (
                      <span className="text-[11px] text-amber-700 font-medium">Pending edit</span>
                    )}
                    <Link
                      href={`/tag/${tag.id}/edit`}
                      className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
                    >
                      <Pencil size={13} />
                      Edit tag
                    </Link>
                  </div>
                )}
              </div>
              <h1 className="font-serif text-[21px] font-medium text-navy-900 leading-snug pt-[10px]">
                {tag.name}
              </h1>
            </div>
          )}

          {/* Topic tag: centered image below title on mobile */}
          {isTopic && tag.image_url && (
            <div className="px-[14px] pt-[8px] flex justify-center">
              <img
                src={tag.image_url}
                alt={tag.name}
                className="rounded-lg object-cover mb-2"
                style={{ width: '60vw', maxWidth: '220px' }}
              />
            </div>
          )}

          {/* Breadcrumb */}
          {(parentTag || grandparentTag) && (
            <div className="flex items-center gap-1 text-[11px] text-gray-400 px-[14px] pt-[4px]">
              {grandparentTag && (
                <>
                  <Link href={`/tag/${grandparentTag.id}`} className="hover:text-navy-600">{grandparentTag.name}</Link>
                  <ChevronRight size={10} />
                </>
              )}
              {parentTag && (
                <>
                  <Link href={`/tag/${parentTag.id}`} className="hover:text-navy-600">{parentTag.name}</Link>
                  <ChevronRight size={10} />
                </>
              )}
              <span className="text-gray-500">{tag.name}</span>
            </div>
          )}

          {/* Description */}
          {displayDescription ? (
            <p className="text-[13px] text-gray-500 leading-[1.55] px-[14px] pt-[6px]">
              {formatRichText(displayDescription)}
            </p>
          ) : isTopic && tag.description ? (
            <p className="text-[13px] text-gray-500 leading-[1.55] px-[14px] pt-[6px]">
              {formatRichText(tag.description)}
            </p>
          ) : null}

          {/* Research attribution + dedication */}
          {creatorName && (
            <p className="font-serif italic text-[13px] text-gray-500 px-[14px] mt-[6px] leading-[1.55]">
              {'Research about this topic was originally performed by '}
              <span className="text-[#1e1e5f]">{creatorName}</span>
              {tag.dedication
                ? (() => { const d = tag.dedication.replace(/[.,;:]+$/, ''); const noTrail = d.endsWith('!') || d.endsWith('?'); return <>{' and dedicated to '}<span className="text-[#1e1e5f]">{d}</span>{noTrail ? '' : '.'}</>; })()
                : '.'}
            </p>
          )}

          {/* Tag links */}
          {tagLinks.length > 0 && (
            <div className="px-[14px] mt-[6px]">
              <h3 className="text-[10px] uppercase tracking-[0.5px] font-medium text-gray-400 mb-1">Links</h3>
              <div className="flex flex-col gap-y-[2px]">
                {tagLinks.map((link, idx) => (
                  <div key={idx} className="flex items-start gap-2 min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] text-navy-700 hover:text-navy-500 font-medium shrink-0"
                    >
                      <ExternalLink size={13} className="shrink-0" />
                      {link.link_type}
                    </a>
                    {link.comment && (
                      <span className="text-[12px] text-gray-500 min-w-0 break-words">{link.comment}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Child location tags */}
          {sortedChildTags.length > 0 && (
            <div className="px-[14px] pt-[10px]">
              <ChildTagPills mobile />
            </div>
          )}

          {/* Results count + View on map */}
          <div className="flex items-center justify-between px-[14px] pt-[12px] pb-[8px] border-b border-gray-200">
            <span className="text-[13px] font-semibold text-navy-900">
              {sites.length} {sites.length === 1 ? 'Result' : 'Results'}
            </span>
            <button
              type="button"
              onClick={() => setMapFullscreen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-700 hover:text-navy-500 min-h-[44px]"
            >
              <Map size={14} />
              View on map
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE SECTION ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="px-3">
            {sites.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-400">
                {isLocation
                  ? `No sites have been added in ${tag.name} yet.`
                  : `No sites have been tagged with ${tag.name} yet.`}
                {(userRole === 'contributor' || userRole === 'administrator') && (
                  <>{' '}<Link href="/contribute/new-site" className="text-navy-600 hover:text-navy-800 font-medium">Contribute a site →</Link></>
                )}
              </p>
            ) : (
              sites.map((site, idx) => (
                <Link
                  key={site.id}
                  href={`/site/${site.id}`}
                  className="flex items-center gap-3 py-[10px] min-h-[44px] border-b border-gray-100 last:border-0"
                >
                  {/* Index */}
                  <span className="text-[12px] text-gray-400 w-4 text-center shrink-0 font-medium">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative shrink-0 w-12 h-12">
                    {site.images[0] ? (
                      <img
                        src={site.images[0].url}
                        alt={site.name}
                        className="w-12 h-12 rounded-[6px] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[6px] bg-navy-100" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-medium text-navy-900 truncate leading-snug">
                      {site.name}
                    </h4>
                    {isTopic && <SiteLocationSubtitle site={site} />}
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-[1.4] mt-0.5">
                      {site.short_description}
                    </p>
                  </div>

                  {/* No SiteRowActions on mobile (insufficient space) */}
                  <ChevronRight size={15} className="text-gray-300 shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Fullscreen map overlay */}
        {mapFullscreen && (
          <div className="fixed inset-0 z-50">
            <MapViewDynamic
              pins={pins}
              initialFitBounds
              highlightedSiteId={popup.highlightedPinId}
              onPopupOpen={popup.onPopupOpen}
              onPopupClose={popup.onPopupClose}
            />
            <div className="absolute top-0 left-0 right-0 z-[500] p-3 flex items-center gap-2">
              <button
                onClick={() => { setMapFullscreen(false); setMapSearchQuery(''); }}
                className="bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md shrink-0"
                aria-label="Close map"
              >
                <X size={20} className="text-navy-700" />
              </button>
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search sites…"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-navy-300"
                />
                {mapSearchResults && mapSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                    {mapSearchResults.map((site) => (
                      <Link
                        key={site.id}
                        href={`/site/${site.id}`}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-sm font-medium text-navy-900 truncate">{site.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {mapSearchResults && mapSearchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3">
                    <span className="text-sm text-gray-500">No results</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP layout (md+) ── */}
      <div className="hidden md:flex flex-col lg:flex-row min-h-[calc(100dvh-56px)]">

        {/* Left: Tag info + site list */}
        <div className="lg:w-1/2 xl:w-[45%] overflow-y-auto">

          {/* Hero banner — location tags only */}
          {isLocation && resolvedHeroImage && (
            <HeroBanner height="230px" textSize="text-2xl md:text-3xl" />
          )}

          <div className="px-4 md:px-6 py-5">
            {/* Back + Edit row */}
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-navy-700 font-medium hover:text-navy-500"
              >
                <ArrowLeft size={16} />
                Back to search
              </Link>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {hasPendingEdit && (
                    <span className="text-xs text-amber-700 font-medium">Pending edit</span>
                  )}
                  <Link
                    href={`/tag/${tag.id}/edit`}
                    className="inline-flex items-center gap-1 text-sm text-navy-700 font-medium hover:text-navy-500"
                  >
                    <Pencil size={14} />
                    Edit tag
                  </Link>
                </div>
              )}
            </div>

            {/* Tag name — always for topic; for location only when no hero */}
            {(!isLocation || !resolvedHeroImage) && (
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900">
                {tag.name}
              </h1>
            )}

            {/* Breadcrumb */}
            {(parentTag || grandparentTag) && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                {grandparentTag && (
                  <>
                    <Link href={`/tag/${grandparentTag.id}`} className="hover:text-navy-600">{grandparentTag.name}</Link>
                    <ChevronRight size={10} />
                  </>
                )}
                {parentTag && (
                  <>
                    <Link href={`/tag/${parentTag.id}`} className="hover:text-navy-600">{parentTag.name}</Link>
                    <ChevronRight size={10} />
                  </>
                )}
                <span className="text-gray-500">{tag.name}</span>
              </div>
            )}

            {/* Description — topic: float image left + text wrap; location: plain text */}
            {isTopic ? (
              <div className="mt-3">
                {tag.image_url && (
                  <img
                    src={tag.image_url}
                    alt={tag.name}
                    className="rounded-lg object-cover"
                    style={{ float: 'left', width: '200px', maxHeight: '280px', marginRight: '16px', marginBottom: '8px' }}
                  />
                )}
                {(displayDescription || tag.description) && (
                  <p className="text-gray-700 leading-relaxed">
                    {formatRichText(displayDescription || tag.description || '')}
                  </p>
                )}
                <div style={{ clear: 'both' }} />
              </div>
            ) : displayDescription ? (
              <p className="mt-3 text-gray-700 leading-relaxed">{displayDescription}</p>
            ) : null}

            {/* Creator attribution — topic tags only */}
            {/* Research attribution + dedication */}
            {creatorName && (
              <p className="font-serif italic text-sm text-gray-500 mt-2 leading-relaxed">
                {'Research about this topic was originally performed by '}
                <span className="text-[#1e1e5f]">{creatorName}</span>
                {tag.dedication
                  ? (() => { const d = tag.dedication.replace(/[.,;:]+$/, ''); const noTrail = d.endsWith('!') || d.endsWith('?'); return <>{' and dedicated to '}<span className="text-[#1e1e5f]">{d}</span>{noTrail ? '' : '.'}</>; })()
                  : '.'}
              </p>
            )}

            {/* Tag links */}
            {tagLinks.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Links</h3>
                <div className="flex flex-col gap-1.5">
                  {tagLinks.map((link, idx) => (
                    <div key={idx} className="flex items-start gap-2 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-navy-700 hover:text-navy-500 font-medium shrink-0"
                      >
                        <ExternalLink size={14} className="shrink-0" />
                        {link.link_type}
                      </a>
                      {link.comment && (
                        <span className="text-sm text-gray-500 min-w-0 break-words">{link.comment}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Child location tags */}
            {sortedChildTags.length > 0 && (
              <div className="mt-4 mb-2">
                <ChildTagPills mobile={false} />
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-900">
                {sites.length} {sites.length === 1 ? 'Result' : 'Results'}
              </span>
            </div>

            {sites.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">
                {isLocation
                  ? `No sites have been added in ${tag.name} yet.`
                  : `No sites have been tagged with ${tag.name} yet.`}
                {(userRole === 'contributor' || userRole === 'administrator') && (
                  <>{' '}<Link href="/contribute/new-site" className="text-navy-600 hover:text-navy-800 font-medium">Contribute a site →</Link></>
                )}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-1">
                {sites.map((site, idx) => (
                  <Link
                    key={site.id}
                    href={`/site/${site.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-400 w-5 shrink-0">
                      {idx + 1}
                    </span>
                    {site.images[0] && (
                      <img
                        src={site.images[0].url}
                        alt={site.name}
                        className="w-14 h-14 object-cover rounded-md shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
                        {site.name}
                      </h4>
                      {isTopic && <SiteLocationSubtitle site={site} />}
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                        {site.short_description}
                      </p>
                    </div>
                    <SiteRowActions siteId={site.id} siteName={site.name} thumbnailUrl={site.images[0]?.url} />
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)]">
          <MapViewDynamic
            pins={pins}
            initialFitBounds
            highlightedSiteId={popup.highlightedPinId}
            onPopupOpen={popup.onPopupOpen}
            onPopupClose={popup.onPopupClose}
          />
        </div>
      </div>

      {popup.portal}
    </>
  );
}
