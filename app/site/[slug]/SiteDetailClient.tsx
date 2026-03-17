'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import MapViewDynamic from '@/components/MapViewDynamic';
import type { Site, Tag, ContributorNote } from '@/lib/types';

interface SiteDetailClientProps {
  site: Site;
  nearbySites: Site[];
  tags: Tag[];
  contributorNotes: ContributorNote[];
  creatorName: string | null;
}

export default function SiteDetailClient({
  site,
  nearbySites,
  tags,
  contributorNotes,
  creatorName,
}: SiteDetailClientProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = site.images.sort((a, b) => a.display_order - b.display_order);

  const sitePin = [{
    id: site.id,
    name: site.name,
    latitude: site.latitude,
    longitude: site.longitude,
    short_description: site.short_description,
    thumbnail_url: images[0]?.url,
  }];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
      {/* Left: Site info */}
      <div className="lg:w-1/2 xl:w-[45%] overflow-y-auto">
        {/* Back navigation */}
        <div className="px-4 md:px-6 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium"
          >
            <ArrowLeft size={16} />
            Back to map
          </Link>
        </div>

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
          {(creatorName || site.contributor) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <User size={12} />
              <span>Added by {creatorName ?? site.contributor}</span>
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
                    {note.author_name && (
                      <span className="ml-1.5 text-xs text-gray-400">— {note.author_name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Nearby sites */}
          {/* {nearbySites.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Also nearby…
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {nearbySites.map((nearby, idx) => (
                  <Link
                    key={nearby.id}
                    href={`/site/${nearby.id}`}
                    className="group rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow bg-white"
                  >
                    {nearby.images[0] && (
                      <div className="h-24 overflow-hidden">
                        <img
                          src={nearby.images[0].url}
                          alt={nearby.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-2">
                      <span className="text-[10px] text-gray-400 font-medium">{idx + 1}</span>
                      <h4 className="text-xs font-semibold text-navy-900 leading-tight line-clamp-2 group-hover:text-navy-600">
                        {nearby.name}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )} */}

          {/* Meta */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">
            {site.updated_at && (
              <span>Last updated {new Date(site.updated_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Map (desktop) */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100vh-56px)]">
        <MapViewDynamic pins={sitePin} initialFitBounds />
      </div>

      {/* Mobile: small map */}
      <div className="lg:hidden mx-4 mb-6 rounded-xl overflow-hidden h-48 border border-gray-200">
        <MapViewDynamic pins={sitePin} initialFitBounds />
      </div>
    </div>
  );
}
