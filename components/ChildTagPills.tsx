'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tag } from '@/lib/types';

interface ChildTagPillsProps {
  childTags: (Tag & { site_count: number })[];
  mobile?: boolean;
  collapseThreshold?: number;
}

export default function ChildTagPills({
  childTags,
  mobile = false,
  collapseThreshold = 8,
}: ChildTagPillsProps) {
  const [showAllRegions, setShowAllRegions] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  if (childTags.length === 0) return null;

  const sorted = [...childTags].sort((a, b) => b.site_count - a.site_count);
  const regions = sorted.filter((t) => t.type === 'region');
  const municipalities = sorted.filter((t) => t.type === 'municipality');

  const visibleRegions = showAllRegions ? regions : regions.slice(0, collapseThreshold);
  const visibleCities = showAllCities ? municipalities : municipalities.slice(0, collapseThreshold);

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
          {regions.length > collapseThreshold && (
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
          {municipalities.length > collapseThreshold && (
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
