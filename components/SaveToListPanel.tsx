'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';

interface SaveToListPanelProps {
  siteId: string;
  siteName: string;
  thumbnailUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  dropUp?: boolean;
}

export default function SaveToListPanel({
  siteId, siteName, thumbnailUrl, isOpen, onClose, dropUp = false,
}: SaveToListPanelProps) {
  const { lists: { getAllLists, getListsForSite, toggleSiteOnList, createList } } = useUserSiteActions();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showCreate) inputRef.current?.focus(); }, [showCreate]);
  useEffect(() => { if (!isOpen) { setShowCreate(false); setNewName(''); } }, [isOpen]);

  const allLists = getAllLists();
  const checkedIds = new Set(getListsForSite(siteId));

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    const newId = await createList(newName.trim());
    if (newId) await toggleSiteOnList(siteId, newId);
    setNewName(''); setShowCreate(false); setCreating(false);
  }

  const sharedContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt={siteName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          : <div className="w-9 h-9 rounded-lg bg-navy-100 shrink-0" />}
        <span className="text-sm font-medium text-navy-900 truncate">{siteName}</span>
      </div>
      <div className="h-px bg-gray-100" />
      <div className="overflow-y-auto" style={{ maxHeight: '40dvh' }}>
        {allLists.map(list => {
          const checked = checkedIds.has(list.id);
          return (
            <button key={list.id} type="button"
              onClick={() => toggleSiteOnList(siteId, list.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left min-h-[44px]"
            >
              <span className="w-[22px] h-[22px] rounded-[4px] shrink-0 flex items-center justify-center"
                style={checked
                  ? { background: '#1e1e5f', border: '1.5px solid #1e1e5f' }
                  : { background: 'transparent', border: '1.5px solid #ccc' }}>
                {checked && <Check size={13} strokeWidth={3} color="white" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-navy-900">{list.name}</p>
                <p className="text-[11px] text-gray-400">{list.site_ids.length} {list.site_ids.length === 1 ? 'site' : 'sites'}</p>
              </div>
            </button>
          );
        })}
        {showCreate ? (
          <div className="px-4 py-2 flex items-center gap-2">
            <input ref={inputRef} type="text" placeholder="List name…" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" />
            <button type="button" onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="text-[12px] font-medium text-navy-700 px-3 py-2 rounded-lg border border-navy-200 hover:bg-navy-50 disabled:opacity-50">
              {creating ? '…' : 'Create'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 min-h-[44px]">
            <span className="w-[22px] h-[22px] rounded-[4px] shrink-0 flex items-center justify-center"
              style={{ border: '1.5px dashed #4a4a9f' }}>
              <Plus size={13} className="text-navy-700" />
            </span>
            <span className="text-[13px] font-medium text-navy-700">Create new list</span>
          </button>
        )}
        <div className="h-2" />
      </div>
    </>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[15px] font-semibold text-navy-900">Save to list</span>
            <button type="button" onClick={onClose}
              className="text-[13px] font-medium text-navy-700 min-h-[44px] px-2">Done</button>
          </div>
          {sharedContent}
          <div className="h-4" />
        </div>
      </div>

      {/* Desktop: dropdown anchored to parent's relative wrapper */}
      <div className={`hidden md:block absolute ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[14px] font-semibold text-navy-900">Save to list</span>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={16} />
          </button>
        </div>
        {sharedContent}
      </div>
    </>
  );
}
