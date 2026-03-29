'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { slugify } from '@/lib/utils';
import type { Tag } from '@/lib/types';

export default function TagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  onTagCreated,
  disabled = false,
  placeholder = 'Add tags…',
}: {
  allTags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onTagCreated: (tag: Tag) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        setCreateError('');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id) && (!t.type || t.type === 'topic'));
  const trimmed = query.trim().toLowerCase();
  const filteredTags = allTags.filter(
    (t) => !selectedIds.includes(t.id) && t.name.toLowerCase().includes(trimmed) && (!t.type || t.type === 'topic')
  );
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === trimmed && (!t.type || t.type === 'topic'));
  const canCreate = trimmed.length > 1 && !exactMatch;

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  function select(id: string) {
    onChange([...selectedIds, id]);
    setQuery('');
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setCreateError('');
    const id = slugify(name);
    const supabase = createClient();
    const { error } = await supabase.from('tags').insert({ id, name, description: '', featured: false });
    setCreating(false);
    if (error) { setCreateError(error.message); return; }
    const newTag: Tag = { id, name, description: '', featured: false };
    onTagCreated(newTag);
    onChange([...selectedIds, id]);
    setQuery('');
    setCreateError('');
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`min-h-[40px] w-full border rounded-lg px-2 py-1.5 flex flex-wrap gap-1 items-center bg-white transition-shadow ${
          open ? 'border-navy-400 ring-2 ring-navy-200' : 'border-gray-200'
        } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-text'}`}
        onClick={() => !disabled && setOpen(true)}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 bg-navy-900 text-white text-xs px-2 py-0.5 rounded-full"
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag.id); }}
              aria-label={`Remove ${tag.name}`}
              className="hover:text-navy-200 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selectedIds.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder-gray-400"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filteredTags.length === 0 && !canCreate && (
            <p className="text-xs text-gray-400 px-3 py-2.5">
              {trimmed ? `No tags matching "${query}"` : 'No more tags'}
            </p>
          )}
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => select(tag.id)}
              className="w-full text-left px-3 py-2 text-sm text-navy-900 hover:bg-gray-50 transition-colors"
            >
              {tag.name}
            </button>
          ))}
          {canCreate && (
            <>
              {filteredTags.length > 0 && <div className="border-t border-gray-100" />}
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors flex items-center gap-1.5"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create &ldquo;{query.trim()}&rdquo;
              </button>
              {createError && (
                <p className="px-3 pb-2 text-xs text-red-500">{createError}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
