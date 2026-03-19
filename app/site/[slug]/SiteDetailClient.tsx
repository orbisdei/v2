'use client';

import { useState } from 'react';
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
      {/* ── MOBILE layout (below md) ── single scrollable column */}
      <div className="md:hidden flex flex-col bg-white pb-[72px]">

        {/* 2. Back link */}
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

        {/* 3. Image gallery */}
        {images.length > 0 && (
          <div className="relative mt-3 mx-[10px] rounded-[10px] overflow-hidden bg-gray-200">
            {/* 16:9 aspect ratio wrapper */}
            <div className="relative w-full aspect-video">
              <img
                src={images[currentImageIndex].url}
                alt={images[currentImageIndex].caption || site.name}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Caption strip — bottom-left */}
              {images[currentImageIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/55 to-transparent">
                  <p className="text-white text-[11px] leading-snug">
                    {images[currentImageIndex].caption}
                  </p>
                </div>
              )}

              {/* Nav arrows — hidden when only one image */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-white/70 flex items-center justify-center shadow"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={13} className="text-gray-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full bg-white/70 flex items-center justify-center shadow"
                    aria-label="Next image"
                  >
                    <ChevronRight size={13} className="text-gray-700" />
                  </button>
                </>
              )}

              {/* Dot indicators — hidden when only one image */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`Image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Site name */}
        <h1 className="font-serif text-[19px] font-medium text-navy-900 leading-[1.3] px-[12px] pt-[12px]">
          {site.name}
        </h1>

        {/* 5. Get directions + interest */}
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

        {/* 6. Topic tags — horizontal scroll, no label, hidden if empty */}
        {tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-[14px]">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.id}`}
                className="shrink-0 px-[11px] py-[5px] rounded-[14px] text-[11px] font-medium border border-navy-200 text-navy-700 whitespace-nowrap hover:bg-navy-50 transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* 7. Description */}
        <p className="text-[13px] text-gray-500 leading-[1.55] px-[10px] pt-[10px] pb-2">
          {site.short_description}
        </p>

        {/* 8. Links */}
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

        {/* 9. Contributor Notes */}
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

        {/* 10. Inline mini map */}
        <div className="relative mx-[10px] mt-4 h-[200px] rounded-[10px] border border-gray-200 overflow-hidden z-[1]">
          <MapViewDynamic pins={sitePin} initialFitBounds />
          <button
            className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-md"
            onClick={() => setMapFullscreen(true)}
            aria-label="Expand map fullscreen"
          >
            <Maximize2 size={16} className="text-navy-700" />
          </button>
        </div>

        {/* 11. Contributor metadata */}
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
            <MapViewDynamic pins={sitePin} initialFitBounds />
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

      {/* Mobile: fixed action bar pinned to bottom */}
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
            <div className="relative mt-3 mx-4 md:mx-6 rounded-xl overflow-hidden bg-gray-200">
              <img
                src={images[currentImageIndex].url}
                alt={images[currentImageIndex].caption || site.name}
                className="w-full h-56 md:h-72 object-cover"
              />

              {images[currentImageIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-white text-xs">{images[currentImageIndex].caption}</p>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                  >
                    <ChevronLeft size={18} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                  >
                    <ChevronRight size={18} className="text-gray-700" />
                  </button>
                </>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Site info */}
          <div className="px-4 md:px-6 py-5">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-navy-900 leading-tight">
              {site.name}
            </h1>

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
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.id}`}
                    className="px-2.5 py-1 text-xs font-medium border border-navy-200 rounded-full text-navy-700 hover:bg-navy-50 transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

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

            {/* Contributor Notes (contributors/admins only — server filters these) */}
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
          <MapViewDynamic pins={sitePin} initialFitBounds />
        </div>

        {/* Mid-size (md–lg): small map below content */}
        <div className="lg:hidden mx-4 mb-6 rounded-xl overflow-hidden h-48 border border-gray-200">
          <MapViewDynamic pins={sitePin} initialFitBounds />
        </div>
      </div>
    </>
  );
}
