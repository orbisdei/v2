'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  User,
  Pencil,
} from 'lucide-react';
import MapViewDynamic from '@/components/MapViewDynamic';
import SiteActionBar from '@/components/SiteActionBar';
import type { Site, Tag, ContributorNote } from '@/lib/types';

// ── Shared helpers ─────────────────────────────────────────────────────────────

type ImageDims = { w: number; h: number };

const fill: React.CSSProperties = {
  position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
  width: '100%', height: '100%',
};

function slideHeight(dims: ImageDims | undefined, containerWidth: number, isMobile: boolean): number {
  if (!dims || !containerWidth) return isMobile ? 200 : 280;
  if (dims.h > dims.w) return containerWidth > 0 ? containerWidth * 0.75 : (isMobile ? 220 : 350);
  return Math.min(containerWidth / (dims.w / dims.h), containerWidth * 0.75);
}

// ── GallerySlide: one image's layers (no container) ───────────────────────────

function GallerySlide({
  src, alt, caption, dims, isMobile, animStyle,
}: {
  src: string; alt: string; caption?: string;
  dims: ImageDims | undefined; isMobile: boolean;
  animStyle?: React.CSSProperties;
}) {
  const isPortrait = dims ? dims.h > dims.w : false;
  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, ...animStyle }}>
      {isPortrait && (
        <img src={src} alt="" aria-hidden style={{ ...fill, objectFit: 'cover', transform: 'scale(1.3)', filter: 'blur(20px) brightness(0.6)' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      )}
      <img src={src} alt={alt} style={{ ...fill, objectFit: isPortrait ? 'contain' : 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
      {caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2">
          <p className="text-white leading-snug" style={{ fontSize: isMobile ? 11 : 12 }}>{caption}</p>
        </div>
      )}
    </div>
  );
}

// ── SiteGallery: crossfading carousel ─────────────────────────────────────────

function SiteGallery({ images, isMobile }: { images: Site['images']; isMobile: boolean }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [allDims, setAllDims] = useState<Record<number, ImageDims>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track container width for landscape height computation
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setContainerWidth(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Eagerly preload dims for every image using Image() — fires for cached images too
  useEffect(() => {
    images.forEach((img, idx) => {
      const i = new Image();
      i.onload = () => {
        if (i.naturalWidth > 0) {
          setAllDims(prev => prev[idx] ? prev : { ...prev, [idx]: { w: i.naturalWidth, h: i.naturalHeight } });
        }
      };
      i.src = img.url;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (nextIdx: number) => {
    if (nextIdx === currentIdx) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPrevIdx(currentIdx);
    setCurrentIdx(nextIdx);
    setIsTransitioning(true);
    timerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setPrevIdx(null);
    }, 320);
  };

  const containerH = slideHeight(allDims[currentIdx], containerWidth, isMobile);
  const currImg = images[currentIdx];
  const prevImg = prevIdx !== null ? images[prevIdx] : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#e5e7eb',
        height: containerH,
        transition: 'height 300ms ease-in-out',
      }}
    >
      {/* Outgoing slide — fades out */}
      {isTransitioning && prevImg && (
        <GallerySlide
          key={`prev-${prevIdx}`}
          src={prevImg.url} alt={prevImg.caption || ''} caption={prevImg.caption}
          dims={allDims[prevIdx!]} isMobile={isMobile}
          animStyle={{ animation: 'gallery-fade-out 300ms ease-in-out forwards' }}
        />
      )}

      {/* Current slide — fades in, then static */}
      <GallerySlide
        key={`curr-${currentIdx}`}
        src={currImg.url} alt={currImg.caption || ''} caption={currImg.caption}
        dims={allDims[currentIdx]} isMobile={isMobile}
        animStyle={isTransitioning
          ? { animation: 'gallery-fade-in 300ms ease-in-out forwards' }
          : { opacity: 1 }}
      />

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => navigateTo(currentIdx === 0 ? images.length - 1 : currentIdx - 1)}
            className={isMobile
              ? 'absolute left-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-white/70 flex items-center justify-center shadow z-10'
              : 'absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors z-10'}
            aria-label="Previous image"
          >
            <ChevronLeft size={isMobile ? 13 : 18} className="text-gray-700" />
          </button>
          <button
            type="button"
            onClick={() => navigateTo(currentIdx === images.length - 1 ? 0 : currentIdx + 1)}
            className={isMobile
              ? 'absolute right-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-white/70 flex items-center justify-center shadow z-10'
              : 'absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors z-10'}
            aria-label="Next image"
          >
            <ChevronRight size={isMobile ? 13 : 18} className="text-gray-700" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
          style={{ bottom: isMobile ? 8 : 12 }}
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigateTo(idx)}
              className={`rounded-full transition-colors ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${idx === currentIdx ? 'bg-white' : 'bg-white/50'}`}
              aria-label={`Image ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SiteDetailClientProps {
  site: Site;
  nearbySites: Site[];
  tags: Tag[];
  contributorNotes: ContributorNote[];
  creatorInitialsDisplay: string | null;
  userRole?: string | null;
  hasPendingEdit?: boolean;
}

export default function SiteDetailClient({
  site,
  nearbySites,
  tags,
  contributorNotes,
  creatorInitialsDisplay,
  userRole,
  hasPendingEdit,
}: SiteDetailClientProps) {
  const canEdit = userRole === 'contributor' || userRole === 'administrator';
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const images = site.images.sort((a, b) => a.display_order - b.display_order);

  const sitePin = [{
    id: site.id,
    name: site.name,
    latitude: site.latitude,
    longitude: site.longitude,
    short_description: site.short_description,
    thumbnail_url: images[0]?.url,
  }];

  const updatedDate = site.updated_at
    ? new Date(site.updated_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <>
      {/* ── MOBILE layout (below md) ── */}
      <div className="md:hidden flex flex-col bg-white pb-[72px]">

        {/* Back link */}
        <div className="px-[10px] pt-[10px] flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
          >
            <ArrowLeft size={14} />
            Back to map
          </Link>
          {canEdit && (
            <Link
              href={`/site/${site.id}/edit`}
              className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
            >
              <Pencil size={13} />
              Edit site
            </Link>
          )}
        </div>

        {/* Pending edit banner */}
        {hasPendingEdit && (
          <div
            className="mx-[10px] mt-2"
            style={{
              background: '#faeeda',
              borderLeft: '3px solid #ba7517',
              borderRadius: 0,
              padding: '10px 14px',
            }}
          >
            <p style={{ fontSize: 13, color: '#854f0b', fontWeight: 500, margin: 0 }}>
              You have edits pending review for this site.
            </p>
          </div>
        )}

        {/* Image gallery */}
        {images.length > 0 && (
          <div className="mt-3 mx-[10px]">
            <SiteGallery images={images} isMobile />
          </div>
        )}

        {/* Site name */}
        <h1 className="font-serif text-[19px] font-medium text-navy-900 leading-[1.3] px-[12px] pt-[12px]">
          {site.name}
        </h1>
        {site.native_name && (
          <p className="px-[12px] text-[13px] text-gray-400 italic leading-snug mt-0.5">
            {site.native_name}
          </p>
        )}

        {/* Get directions + interest */}
        <div className="px-[12px] flex items-center gap-4">
          {site.google_maps_url && (
            <a
              href={site.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-navy-700 font-medium min-h-[44px] hover:text-navy-500"
            >
              <MapPin size={13} />
              Get directions
              <ExternalLink size={11} />
            </a>
          )}
          {site.interest && (
            <span className="capitalize text-[12px] text-gray-500">{site.interest} interest</span>
          )}
        </div>

        {/* Topic tags */}
        {tags.length > 0 && (() => {
          const locationTags = tags.filter(t => t.type && t.type !== 'topic');
          const topicTags = tags.filter(t => !t.type || t.type === 'topic');
          const typeOrder = { country: 0, region: 1, municipality: 2 };
          locationTags.sort((a, b) => (typeOrder[a.type as keyof typeof typeOrder] ?? 9) - (typeOrder[b.type as keyof typeof typeOrder] ?? 9));
          return (
            <div className="flex flex-wrap items-center gap-1.5 py-1 px-[14px]">
              {locationTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.id}`}
                  className="shrink-0 px-[11px] py-[5px] rounded-[14px] text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap hover:bg-blue-100 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
              {locationTags.length > 0 && topicTags.length > 0 && (
                <span className="w-px h-4 bg-gray-300 mx-0.5" />
              )}
              {topicTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.id}`}
                  className="shrink-0 px-[11px] py-[5px] rounded-[14px] text-[11px] font-medium border border-navy-200 text-navy-700 whitespace-nowrap hover:bg-navy-50 transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          );
        })()}

        {/* Description */}
        <p className="text-[13px] text-gray-500 leading-[1.55] px-[10px] pt-[10px] pb-2">
          {site.short_description}
        </p>

        {/* Links */}
        {site.links.length > 0 && (
          <div className="px-[10px] mt-2">
            <h3 className="text-[10px] uppercase tracking-[0.5px] font-medium text-gray-400 mb-1">
              Links
            </h3>
            <div className="flex flex-col gap-y-[2px]">
              {site.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[12px] text-navy-700 font-medium min-h-[36px] py-[2px] hover:text-navy-500"
                >
                  <ExternalLink size={13} className="shrink-0" />
                  {link.link_type}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contributor Notes */}
        {contributorNotes.length > 0 && (
          <div className="px-[10px] mt-2">
            <h3 className="text-[10px] uppercase tracking-[0.5px] font-medium text-gray-400 mb-1">
              Contributor Notes
            </h3>
            <ul className="flex flex-col gap-y-1">
              {contributorNotes.map((note) => (
                <li key={note.id} className="text-[12px] text-gray-600 leading-relaxed py-[2px]">
                  {note.note}
                  {note.author_initials_display && (
                    <span className="ml-1.5 text-[11px] text-gray-400">— {note.author_initials_display}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inline mini map */}
        <div className="relative mx-[10px] mt-4 h-[200px] rounded-[10px] border border-gray-200 overflow-hidden z-[1]">
          <MapViewDynamic pins={sitePin} initialFitBounds suppressPopups />
          <button
            className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-md"
            onClick={() => setMapFullscreen(true)}
            aria-label="Expand map fullscreen"
          >
            <Maximize2 size={16} className="text-navy-700" />
          </button>
        </div>

        {/* Contributor metadata */}
        {(creatorInitialsDisplay || updatedDate) && (
          <div className="mt-4 mx-[10px] pt-3 border-t border-gray-100 pb-[16px]">
            <p className="text-[10px] text-gray-400">
              {creatorInitialsDisplay && updatedDate
                ? `Contributed by ${creatorInitialsDisplay} · Last updated ${updatedDate}`
                : creatorInitialsDisplay
                ? `Contributed by ${creatorInitialsDisplay}`
                : `Last updated ${updatedDate}`}
            </p>
          </div>
        )}

        {/* Fullscreen map overlay */}
        {mapFullscreen && (
          <div className="fixed inset-0 z-50">
            <MapViewDynamic pins={sitePin} initialFitBounds suppressPopups />
            <button
              onClick={() => setMapFullscreen(false)}
              className="absolute top-4 left-4 z-[500] bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md"
              aria-label="Close fullscreen map"
            >
              <X size={20} className="text-navy-700" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: fixed action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <SiteActionBar siteId={site.id} siteName={site.name} thumbnailUrl={images[0]?.url} />
      </div>

      {/* ── DESKTOP layout (md+) ── */}
      <div className="hidden md:flex flex-col lg:flex-row min-h-[calc(100dvh-56px)]">

        {/* Left: Site info */}
        <div className="lg:w-1/2 xl:w-[45%] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Back navigation */}
            <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium"
              >
                <ArrowLeft size={16} />
                Back to map
              </Link>
              {canEdit && (
                <Link
                  href={`/site/${site.id}/edit`}
                  className="inline-flex items-center gap-1 text-[13px] text-navy-700 hover:text-navy-500 font-medium"
                >
                  <Pencil size={14} />
                  Edit site
                </Link>
              )}
            </div>

            {/* Pending edit banner */}
            {hasPendingEdit && (
              <div
                className="mx-4 md:mx-6 mt-3"
                style={{
                  background: '#faeeda',
                  borderLeft: '3px solid #ba7517',
                  padding: '10px 14px',
                }}
              >
                <p style={{ fontSize: 13, color: '#854f0b', fontWeight: 500, margin: 0 }}>
                  You have edits pending review for this site.
                </p>
              </div>
            )}

            {/* Image gallery */}
            {images.length > 0 && (
              <div className="mt-3 mx-4 md:mx-6">
                <SiteGallery images={images} isMobile={false} />
              </div>
            )}

            {/* Site info */}
            <div className="px-4 md:px-6 py-5">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900 leading-tight">
                {site.name}
              </h1>
              {site.native_name && (
                <p className="text-sm text-gray-400 italic mt-1">
                  {site.native_name}
                </p>
              )}

              {/* Location + interest */}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                {site.google_maps_url && (
                  <a
                    href={site.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-navy-700 hover:text-navy-500 font-medium"
                  >
                    <MapPin size={14} />
                    Get directions
                    <ExternalLink size={12} />
                  </a>
                )}
                {site.interest && (
                  <span className="capitalize text-gray-500">{site.interest} interest</span>
                )}
              </div>

              {/* Attribution */}
              {creatorInitialsDisplay && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <User size={12} />
                  <span>Added by {creatorInitialsDisplay}</span>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (() => {
                const locationTags = tags.filter(t => t.type && t.type !== 'topic');
                const topicTags = tags.filter(t => !t.type || t.type === 'topic');
                const typeOrder = { country: 0, region: 1, municipality: 2 };
                locationTags.sort((a, b) => (typeOrder[a.type as keyof typeof typeOrder] ?? 9) - (typeOrder[b.type as keyof typeof typeOrder] ?? 9));
                return (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {locationTags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tag/${tag.id}`}
                        className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                    {locationTags.length > 0 && topicTags.length > 0 && (
                      <span className="w-px h-4 bg-gray-300 mx-0.5" />
                    )}
                    {topicTags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/tag/${tag.id}`}
                        className="px-2.5 py-1 text-xs font-medium border border-navy-200 rounded-full text-navy-700 hover:bg-navy-50 transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                );
              })()}

              {/* Description */}
              <p className="mt-4 text-gray-700 leading-relaxed">
                {site.short_description}
              </p>

              {/* Links */}
              {site.links.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Links
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {site.links.map((link, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-navy-700 hover:text-navy-500 font-medium shrink-0"
                        >
                          <ExternalLink size={14} className="shrink-0" />
                          {link.link_type}
                        </a>
                        {link.comment && (
                          <span className="text-sm text-gray-500">{link.comment}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contributor Notes */}
              {contributorNotes.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Contributor Notes
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {contributorNotes.map((note) => (
                      <li key={note.id} className="text-sm text-gray-600 leading-relaxed">
                        {note.note}
                        {note.author_initials_display && (
                          <span className="ml-1.5 text-xs text-gray-400">— {note.author_initials_display}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meta */}
              <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">
                {site.updated_at && (
                  <span>Last updated {new Date(site.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>{/* end flex-1 scroll */}
          <SiteActionBar siteId={site.id} siteName={site.name} thumbnailUrl={images[0]?.url} />
        </div>{/* end left panel */}

        {/* Right: Map (desktop lg+) */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)]">
          <MapViewDynamic pins={sitePin} initialFitBounds suppressPopups />
        </div>

        {/* Mid-size (md–lg): small map below content */}
        <div className="lg:hidden mx-4 mb-6 rounded-xl overflow-hidden h-48 border border-gray-200">
          <MapViewDynamic pins={sitePin} initialFitBounds suppressPopups />
        </div>
      </div>
    </>
  );
}
