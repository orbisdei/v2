'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, GripVertical, X, Globe, Lock, Link2, Bookmark,
  MapPin as MapPinIcon, ChevronRight, Pencil,
} from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import MapViewDynamic from '@/components/MapViewDynamic';
import type { UserListDetail, MapPin } from '@/lib/types';

interface ListDetailClientProps {
  list: UserListDetail;
  pins: MapPin[];
  isOwner: boolean;
  /** When true: title/description are locked and sites cannot be removed. */
  isVisited?: boolean;
}

export default function ListDetailClient({ list, isOwner, isVisited = false }: ListDetailClientProps) {
  const router = useRouter();
  const { lists: listsHook } = useUserSiteActions();
  const { updateList, reorderItems, removeFromList } = listsHook;

  const [sites, setSites] = useState(list.sites);
  const [listName, setListName] = useState(list.name);
  const [listDescription, setListDescription] = useState(list.description);
  const [isPublic, setIsPublic] = useState(list.is_public);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameInput, setNameInput] = useState(list.name);
  const [descInput, setDescInput] = useState(list.description);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingDescription) descInputRef.current?.focus(); }, [editingDescription]);

  const visiblePins: MapPin[] = useMemo(() =>
    sites.map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      short_description: s.short_description,
      interest: s.interest,
      thumbnail_url: s.images[0]?.url,
    })),
    [sites]
  );

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameInput(listName); setEditingName(false); return; }
    setListName(trimmed);
    setEditingName(false);
    await updateList(list.id, { name: trimmed });
  }

  async function handleSaveDescription() {
    const trimmed = descInput.trim();
    setListDescription(trimmed);
    setEditingDescription(false);
    await updateList(list.id, { description: trimmed });
  }

  async function handleTogglePublic() {
    const next = !isPublic;
    setIsPublic(next);
    await updateList(list.id, { is_public: next });
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleReorder(fromIdx: number, toIdx: number) {
    const next = [...sites];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setSites(next);
    reorderItems(list.id, next.map(s => s.id));
  }

  function handleRemove(siteId: string) {
    setSites(prev => prev.filter(s => s.id !== siteId));
    removeFromList(siteId, list.id);
  }

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e1e5f]/30";

  const leftPanel = (
    <div className="px-4 py-6 lg:px-8">
      {/* Back link */}
      {isOwner || isVisited ? (
        <Link
          href="/lists"
          className="inline-flex items-center gap-1 text-sm text-[#1e1e5f] hover:text-[#2a2a7a] font-medium mb-4"
        >
          <ArrowLeft size={16} /> Back to lists
        </Link>
      ) : (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-[#1e1e5f] hover:text-[#2a2a7a] font-medium mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {/* List name */}
      {editingName && !isVisited ? (
        <input
          ref={nameInputRef}
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSaveName();
            if (e.key === 'Escape') { setNameInput(listName); setEditingName(false); }
          }}
          className={`${inputClass} text-2xl font-bold mb-1`}
          style={{ fontFamily: 'Georgia, serif' }}
        />
      ) : (
        <div className="flex items-start gap-2 group mb-1">
          <h1
            style={{ fontFamily: 'Georgia, serif' }}
            className={`text-2xl font-bold text-gray-900 ${isOwner && !isVisited ? 'cursor-pointer' : ''}`}
            onClick={() => isOwner && !isVisited && setEditingName(true)}
          >
            {listName}
          </h1>
          {isOwner && !isVisited && (
            <Pencil
              size={14}
              className="text-gray-300 group-hover:text-gray-400 mt-1.5 shrink-0 cursor-pointer"
              onClick={() => setEditingName(true)}
            />
          )}
        </div>
      )}

      {/* Description */}
      {editingDescription && !isVisited ? (
        <textarea
          ref={descInputRef}
          value={descInput}
          onChange={e => setDescInput(e.target.value)}
          onBlur={handleSaveDescription}
          onKeyDown={e => {
            if (e.key === 'Escape') { setDescInput(listDescription); setEditingDescription(false); }
          }}
          rows={3}
          className={`${inputClass} resize-none mt-1`}
        />
      ) : (
        <div className="group flex items-start gap-1.5">
          <p
            className={`text-sm mt-1 ${listDescription ? 'text-gray-600' : 'text-gray-400 italic'} ${isOwner && !isVisited ? 'cursor-pointer' : ''}`}
            onClick={() => isOwner && !isVisited && setEditingDescription(true)}
          >
            {listDescription || (isOwner && !isVisited ? 'Add a description…' : '')}
          </p>
          {isOwner && !isVisited && listDescription && (
            <Pencil
              size={12}
              className="text-gray-300 group-hover:text-gray-400 mt-1.5 shrink-0 cursor-pointer"
              onClick={() => setEditingDescription(true)}
            />
          )}
        </div>
      )}

      {/* Owner attribution (non-owner view) */}
      {!isOwner && !isVisited && (
        <div className="flex items-center gap-2 mt-2">
          {list.owner_avatar_url ? (
            <img src={list.owner_avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ background: '#1e1e5f' }}
            >
              {list.owner_initials_display}
            </div>
          )}
          <span className="text-sm text-gray-500">
            By{' '}
            <Link
              href={`/user/${list.owner_initials_display}`}
              className="text-[#1e1e5f] font-medium hover:text-[#2a2a7a]"
            >
              {list.owner_display_name ?? list.owner_initials_display}
            </Link>
          </span>
        </div>
      )}

      {/* Owner controls */}
      {isOwner && !isVisited && (
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <button
            onClick={handleTogglePublic}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isPublic ? <Globe size={14} /> : <Lock size={14} />}
            {isPublic ? 'Public' : 'Private'}
          </button>
          {isPublic && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-sm text-[#1e1e5f] hover:text-[#2a2a7a] font-medium transition-colors"
            >
              <Link2 size={14} />
              {copiedLink ? 'Copied!' : 'Copy link'}
            </button>
          )}
        </div>
      )}

      {/* Site count */}
      <div className="mt-4 mb-2">
        <span className="text-sm font-semibold text-gray-900">
          {sites.length} {sites.length === 1 ? 'site' : 'sites'}
        </span>
      </div>

      {/* Site rows */}
      {sites.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{isVisited ? 'No visited sites yet' : 'This list is empty'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {isVisited
              ? 'Mark sites as visited to see them here.'
              : 'Browse sites and use the bookmark button to add them.'}
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-[#1e1e5f] hover:text-[#2a2a7a] font-medium">
            Browse sites →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sites.map((site, idx) => (
            <div
              key={site.id}
              draggable={isOwner && !isVisited}
              onDragStart={() => !isVisited && setDragIdx(idx)}
              onDragOver={e => { e.preventDefault(); !isVisited && setDragOverIdx(idx); }}
              onDragEnd={() => {
                if (!isVisited && dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                  handleReorder(dragIdx, dragOverIdx);
                }
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              className={[
                'flex items-center gap-3 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-gray-200',
                dragIdx === idx ? 'opacity-30' : '',
                dragOverIdx === idx && dragIdx !== idx ? 'border-t-2 border-[#1e1e5f]' : '',
              ].join(' ')}
            >
              {/* Drag handle */}
              {isOwner && !isVisited && (
                <div className="cursor-grab active:cursor-grabbing shrink-0">
                  <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400" />
                </div>
              )}

              {/* Row number */}
              <span className="text-sm font-medium text-gray-400 w-5 shrink-0 text-right">{idx + 1}</span>

              {/* Thumbnail */}
              {site.images[0] && (
                <img
                  src={site.images[0].url}
                  alt={site.name}
                  className="w-14 h-14 object-cover rounded-md shrink-0"
                  loading="lazy"
                />
              )}

              {/* Text */}
              <Link href={`/site/${site.id}`} className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#1e1e5f]">
                  {site.name}
                </h4>
                {(site.municipality || site.region || site.country) && (
                  <p className="text-xs text-gray-400 truncate">
                    {[site.municipality, site.region, site.country].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{site.short_description}</p>
              </Link>

              {/* Remove button */}
              {isOwner && !isVisited && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); handleRemove(site.id); }}
                  className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 max-md:opacity-100"
                  title="Remove from list"
                >
                  <X size={16} />
                </button>
              )}

              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop split / mobile single column */}
      <div className="flex">
        {/* Left panel */}
        <div className="w-full lg:w-1/2 xl:w-[45%] lg:h-[calc(100dvh-56px)] lg:overflow-y-auto">
          {leftPanel}
        </div>

        {/* Right map panel — desktop only */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55%] sticky top-0 h-[calc(100dvh-56px)] relative">
          <MapViewDynamic pins={visiblePins} initialFitBounds />
        </div>
      </div>

      {/* Mobile: Show map button */}
      <button
        onClick={() => setShowFullMap(true)}
        className="lg:hidden fixed bottom-6 right-4 z-30 bg-[#1e1e5f] text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        <MapPinIcon size={16} /> Show map
      </button>

      {/* Mobile: Fullscreen map overlay */}
      {showFullMap && (
        <div className="fixed inset-0 z-50 bg-gray-50">
          <button
            onClick={() => setShowFullMap(false)}
            className="absolute top-4 right-4 z-[1000] bg-white rounded-full p-2 shadow-md"
          >
            <X size={20} />
          </button>
          <MapViewDynamic pins={visiblePins} initialFitBounds />
        </div>
      )}
    </>
  );
}
