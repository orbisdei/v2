'use client';

import Link from 'next/link';
import type { Tag } from '@/lib/types';

interface TagListRowProps {
  tag: Tag;
  /** Optional: show site count (requires tag.site_count which is not in the Tag type yet) */
  showCount?: boolean;
}

export default function TagListRow({ tag }: TagListRowProps) {
  const isTopic = !tag.type || tag.type === 'topic';

  const typeBadgeClass: Record<string, string> = {
    topic: 'bg-purple-50 text-purple-700',
    country: 'bg-blue-50 text-blue-700',
    region: 'bg-cyan-50 text-cyan-700',
    municipality: 'bg-teal-50 text-teal-700',
  };

  const placeholderClass: Record<string, string> = {
    country: 'bg-blue-100 text-blue-600',
    region: 'bg-cyan-100 text-cyan-600',
    municipality: 'bg-teal-100 text-teal-600',
  };

  const tagType = tag.type ?? 'topic';
  const badgeClass = typeBadgeClass[tagType] ?? 'bg-purple-50 text-purple-700';
  const displayType = tagType.charAt(0).toUpperCase() + tagType.slice(1);

  return (
    <Link href={`/tag/${tag.id}`} className="flex gap-2.5 py-2 border-b border-gray-100 last:border-0">
      {/* Image / placeholder */}
      <div className="w-[60px] h-[60px] rounded-lg shrink-0 overflow-hidden">
        {isTopic && tag.image_url ? (
          <img
            src={tag.image_url}
            alt={tag.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isTopic ? (
          <div className="w-full h-full bg-navy-100 flex items-center justify-center text-navy-600 text-lg">
            ✙
          </div>
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-lg font-semibold ${
              placeholderClass[tagType] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {tag.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-serif text-[13px] font-semibold leading-tight line-clamp-2 ${
            isTopic ? 'text-navy-900' : 'text-blue-900'
          }`}
        >
          {tag.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
            {displayType}
          </span>
          {tag.featured && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#fef8e0] text-[#8a6d0b]">
              featured
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
