'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Globe, Lock, Bookmark, MoreHorizontal } from 'lucide-react';

interface ListCardProps {
  list: {
    id: string;
    name: string;
    description?: string;
    is_public?: boolean;
    site_count: number;
    updated_at?: string;
    preview_thumbnails: string[];
  };
  editable?: boolean;
  onRename?: (id: string) => void;
  onEditDescription?: (id: string) => void;
  onTogglePublic?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export default function ListCard({ list, editable, onRename, onEditDescription, onTogglePublic, onDelete }: ListCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const thumbnails = list.preview_thumbnails ?? [];

  function ThumbnailStrip() {
    if (thumbnails.length === 0) {
      return (
        <div className="flex items-center justify-center w-full h-12 bg-gray-100 rounded-lg mb-3">
          <Bookmark size={20} className="text-gray-300" />
        </div>
      );
    }
    return (
      <div className="flex gap-1.5 mb-3">
        {[0, 1, 2].map(i => (
          thumbnails[i] ? (
            <img
              key={i}
              src={thumbnails[i]}
              alt=""
              className="w-12 h-12 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div key={i} className="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0" />
          )
        ))}
      </div>
    );
  }

  const metaLine = [
    `${list.site_count} site${list.site_count === 1 ? '' : 's'}`,
    list.updated_at ? relativeTime(list.updated_at) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link href={`/list/${list.id}`} className="block">
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer relative">
        {/* Top-right controls */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {editable && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="List options"
              >
                <MoreHorizontal size={16} className="text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onRename?.(list.id); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Rename
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onEditDescription?.(list.id); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Edit description
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onTogglePublic?.(list.id); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {list.is_public ? 'Make private' : 'Make public'}
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete?.(list.id); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
          {list.is_public !== undefined && (
            list.is_public
              ? <Globe size={14} className="text-gray-300" />
              : <Lock size={14} className="text-gray-300" />
          )}
        </div>

        <ThumbnailStrip />

        <p className="text-sm font-semibold text-gray-900 truncate pr-6">{list.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{metaLine}</p>
        {list.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{list.description}</p>
        )}
      </div>
    </Link>
  );
}
