'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCountryName } from '@/lib/countries';
import type { Site } from '@/lib/types';

interface SiteGridCardProps {
  site: Site;
}

export default function SiteGridCard({ site }: SiteGridCardProps) {
  const locationParts = [
    site.municipality,
    site.country ? getCountryName(site.country) : undefined,
  ].filter(Boolean);
  const location = locationParts.join(', ');

  return (
    <Link
      href={`/site/${site.id}`}
      className="block rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-white"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-navy-100">
        {site.images[0] ? (
          <Image
            src={site.images[0].url}
            alt={site.name}
            fill
            sizes="50vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Plus size={24} className="text-navy-300" />
          </div>
        )}
      </div>

      {/* Text area */}
      <div className="p-2">
        <p className="font-serif text-[12px] font-semibold text-navy-900 line-clamp-2 leading-tight">
          {site.name}
        </p>
        {location && (
          <p className="text-[10px] text-gray-500 mt-1">{location}</p>
        )}
      </div>
    </Link>
  );
}
