'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe, Lock, Link2, Bookmark,
  MapPin as MapPinIcon, Pencil,
} from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import MapViewDynamic from '@/components/MapViewDynamic';
import MapListSplitLayout from '@/components/MapListSplitLayout';
import SiteListItem from '@/components/SiteListItem';
import BackLink from '@/components/BackLink';
import UserAvatar from '@/components/UserAvatar';
import SiteFloatingCard from '@/components/SiteFloatingCard';
import FullscreenMapOverlay from '@/components/FullscreenMapOverlay';
import { useLeafletPopupCard } from '@/lib/hooks/useLeafletPopupCard';
import { useMapFloatingCard } from '@/lib/hooks/useMapFloatingCard';
import type { UserListDetail, MapPin, Tag } from '@/lib/types';

interface ListDetailClientProps {
  list: UserListDetail;
  pins: MapPin[];
  isOwner: boolean;
  allTags: Tag[];
  /** When true: title/description are locked and sites cannot be removed. */
  isVisited?: boolean;
}

export default function ListDetailClient({ list, isOwner, allTags, isVisited = false }: ListDetailClientProps) {
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

  const desktopPopup = useLeafletPopupCard(sites, allTags);
  const fullscreenCard = useMapFloatingCard(sites, allTags);

  useEffect(() => {
    if (!showFullMap) fullscreenCard.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFullMap]);

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
      <div className="mb-4">
        {isOwner || isVisited ? (
          <BackLink href="/lists" size="md">Back to lists</BackLink>
        ) : (
          <BackLink onClick={() => router.back()} size="md">Back</BackLink>
        )}
      </div>

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
          <UserAvatar
            avatarUrl={list.owner_avatar_url}
            initials={list.owner_initials_display}
            size={28}
          />
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
          {sites.map((site, idx) => {
            const canEdit = isOwner && !isVisited;
            const locationParts = [site.municipality, site.region, site.country].filter(Boolean);
            return (
              <SiteListItem
                key={site.id}
                site={site}
                index={idx}
                draggable={canEdit}
                isDragging={dragIdx === idx}
                isDropTarget={dragOverIdx === idx && dragIdx !== idx}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={() => setDragOverIdx(idx)}
                onDragEnd={() => {
                  if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                    handleReorder(dragIdx, dragOverIdx);
                  }
                  setDragIdx(null);
                  setDragOverIdx(null);
                }}
                onRemove={canEdit ? () => handleRemove(site.id) : undefined}
                locationSubtitle={locationParts.length > 0 ? (
                  <p className="text-xs text-gray-400 truncate">{locationParts.join(', ')}</p>
                ) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <MapListSplitLayout
        left={leftPanel}
        map={
          <MapViewDynamic
            pins={visiblePins}
            initialFitBounds
            highlightedSiteId={desktopPopup.highlightedPinId}
            onPopupOpen={desktopPopup.onPopupOpen}
            onPopupClose={desktopPopup.onPopupClose}
          />
        }
      />
      {desktopPopup.portal}

      {/* Mobile: Show map button */}
      <button
        onClick={() => setShowFullMap(true)}
        className="lg:hidden fixed bottom-6 right-4 z-30 bg-[#1e1e5f] text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        <MapPinIcon size={16} /> Show map
      </button>

      {/* Mobile: Fullscreen map overlay */}
      {showFullMap && (
        <FullscreenMapOverlay
          onClose={() => setShowFullMap(false)}
          className="bg-gray-50"
          map={
            <MapViewDynamic
              pins={visiblePins}
              initialFitBounds
              suppressPopups
              highlightedSiteId={fullscreenCard.selectedId}
              onPinClick={fullscreenCard.onPinClick}
            />
          }
          floatingCard={
            fullscreenCard.site && (
              <SiteFloatingCard
                site={fullscreenCard.site}
                tags={fullscreenCard.tags}
                onClose={fullscreenCard.close}
              />
            )
          }
        />
      )}
    </>
  );
}
