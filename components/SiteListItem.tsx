'use client';

import Link from 'next/link';
import { ChevronRight, GripVertical, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Site } from '@/lib/types';

interface SiteListItemProps {
  site: Site;
  index: number;
  locationSubtitle?: ReactNode;
  rightActions?: ReactNode;

  /** Drag state (ListDetail reorder). */
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;

  /** Remove button (ListDetail). */
  onRemove?: () => void;
}

export default function SiteListItem({
  site,
  index,
  locationSubtitle,
  rightActions,
  draggable = false,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onRemove,
}: SiteListItemProps) {
  const rowClass = [
    'flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200',
    isDragging ? 'opacity-30' : '',
    isDropTarget ? 'border-t-2 border-[#1e1e5f]' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      draggable={draggable || undefined}
      onDragStart={draggable ? onDragStart : undefined}
      onDragOver={draggable ? (e) => { e.preventDefault(); onDragOver?.(e); } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={rowClass}
    >
      {draggable && (
        <div className="cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400" />
        </div>
      )}

      <Link href={`/site/${site.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-400 w-5 shrink-0 text-right">{index + 1}</span>

        {site.images[0] && (
          <img
            src={site.images[0].url}
            alt={site.name}
            className="w-14 h-14 object-cover rounded-md shrink-0"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-navy-900 truncate group-hover:text-navy-600">
            {site.name}
          </h4>
          {locationSubtitle}
          {site.short_description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{site.short_description}</p>
          )}
        </div>
      </Link>

      {rightActions}

      {onRemove && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 max-md:opacity-100"
          title="Remove from list"
        >
          <X size={16} />
        </button>
      )}

      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
    </div>
  );
}
