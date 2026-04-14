'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Bookmark } from 'lucide-react';
import ListCard from '@/components/ListCard';
import { useUserSiteActions } from '@/context/UserSiteActionsContext';
import type { UserListWithCount } from '@/lib/types';

interface ListsClientProps {
  initialLists: UserListWithCount[];
  visitedSummary: UserListWithCount | null;
}

export default function ListsClient({ initialLists, visitedSummary }: ListsClientProps) {
  const router = useRouter();
  const { lists: listsHook } = useUserSiteActions();
  const { createList, updateList, deleteList } = listsHook;

  const [lists, setLists] = useState<UserListWithCount[]>(initialLists);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [descriptionTarget, setDescriptionTarget] = useState<{ id: string; description: string } | null>(null);

  // Close modals on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setDeleteTarget(null);
        setRenameTarget(null);
        setDescriptionTarget(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function handleRename(id: string) {
    const list = lists.find(l => l.id === id);
    if (list) setRenameTarget({ id, name: list.name });
  }

  function handleEditDescription(id: string) {
    const list = lists.find(l => l.id === id);
    if (list) setDescriptionTarget({ id, description: list.description ?? '' });
  }

  async function handleTogglePublic(id: string) {
    const list = lists.find(l => l.id === id);
    if (!list) return;
    const next = !list.is_public;
    setLists(prev => prev.map(l => l.id === id ? { ...l, is_public: next } : l));
    await updateList(id, { is_public: next });
  }

  function handleDeleteClick(id: string) {
    const list = lists.find(l => l.id === id);
    if (list) setDeleteTarget({ id, name: list.name });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteList(deleteTarget.id);
    setLists(prev => prev.filter(l => l.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 style={{ fontFamily: 'Georgia, serif' }} className="text-2xl font-bold text-gray-900">
          My Lists
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 bg-[#1e1e5f] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2a2a7a] transition-colors"
        >
          <Plus size={16} />
          New list
        </button>
      </div>

      {/* Visited list — always first, pinned, not editable */}
      {visitedSummary && (
        <div className="mb-6">
          <ListCard
            list={{ ...visitedSummary, id: 'visited' }}
            editable={false}
          />
        </div>
      )}

      {/* Grid or empty state */}
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Bookmark size={32} className="text-gray-300" />
          <p className="text-gray-500 font-medium">No lists yet</p>
          <p className="text-sm text-gray-400">Create a list to start saving sites</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-2 inline-flex items-center gap-1.5 bg-[#1e1e5f] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2a2a7a] transition-colors"
          >
            <Plus size={16} />
            Create your first list
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              editable
              onRename={handleRename}
              onEditDescription={handleEditDescription}
              onTogglePublic={handleTogglePublic}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, description) => {
            const newId = await createList(name);
            if (newId) {
              // Optimistically add to local list
              setLists(prev => [{
                id: newId,
                name,
                description: description ?? '',
                is_public: false,
                site_count: 0,
                updated_at: new Date().toISOString(),
                preview_thumbnails: [],
              }, ...prev]);
              if (description) await updateList(newId, { description });
              router.push(`/list/${newId}`);
            }
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Rename modal */}
      {renameTarget && (
        <TextFieldModal
          title="Rename list"
          label="Name"
          initialValue={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onSave={async (value) => {
            const id = renameTarget.id;
            setLists(prev => prev.map(l => l.id === id ? { ...l, name: value } : l));
            await updateList(id, { name: value });
            setRenameTarget(null);
          }}
          saveLabel="Save"
        />
      )}

      {/* Description edit modal */}
      {descriptionTarget && (
        <TextFieldModal
          title="Edit description"
          label="Description"
          initialValue={descriptionTarget.description}
          multiline
          onClose={() => setDescriptionTarget(null)}
          onSave={async (value) => {
            const id = descriptionTarget.id;
            setLists(prev => prev.map(l => l.id === id ? { ...l, description: value } : l));
            await updateList(id, { description: value });
            setDescriptionTarget(null);
          }}
          saveLabel="Save"
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ModalBackdrop onClose={() => setDeleteTarget(null)}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Delete &ldquo;{deleteTarget.name}&rdquo;?
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            This will remove the list and all saved sites from it.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ---- Shared modal primitives ----

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 mt-[20vh] shadow-xl">
        {children}
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onCreate(name.trim(), description.trim() || undefined);
    setSubmitting(false);
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Create new list</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="List name"
          required
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e1e5f]/30"
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e1e5f]/30 resize-none"
        />
        <div className="flex justify-end gap-3 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="px-4 py-2 text-sm font-medium bg-[#1e1e5f] text-white rounded-lg hover:bg-[#2a2a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

function TextFieldModal({ title, label, initialValue, multiline, onClose, onSave, saveLabel }: {
  title: string;
  label: string;
  initialValue: string;
  multiline?: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
  saveLabel: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
  }

  const inputClass = "border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#1e1e5f]/30";

  return (
    <ModalBackdrop onClose={onClose}>
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      <label className="block text-xs text-gray-500 mb-3">{label}</label>
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none mb-4`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          className={`${inputClass} mb-4`}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />
      )}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-[#1e1e5f] text-white rounded-lg hover:bg-[#2a2a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </ModalBackdrop>
  );
}
