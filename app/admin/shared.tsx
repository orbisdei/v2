'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Star, Loader2, ListFilter } from 'lucide-react';

// ── Shared style constant ──────────────────────────────────────

export const EDIT_INPUT_CLS =
  'w-full border border-navy-400 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy-300';

// ── Inline edit cell ───────────────────────────────────────────

export function InlineEditCell({
  value,
  displayNode,
  inputType = 'text',
  options,
  maxLength,
  transform,
  tdClassName,
  viewClassName,
  onSave,
}: {
  value: string;
  displayNode?: ReactNode;
  inputType?: 'text' | 'select' | 'textarea';
  options?: { value: string; label: string }[];
  maxLength?: number;
  transform?: (val: string) => string;
  tdClassName?: string;
  viewClassName?: string;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus();
    if (inputType === 'text' || inputType === 'textarea') {
      (inputRef.current as HTMLInputElement).select();
    }
  }, [editing, inputType]);

  async function commit() {
    const final = transform ? transform(draft) : draft;
    if (final === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(final); }
    catch { setDraft(value); }
    finally { setSaving(false); setEditing(false); }
  }

  function cancel() { setDraft(value); setEditing(false); }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && inputType !== 'textarea') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }

  return (
    <td
      className={`px-3 py-1 ${tdClassName ?? ''} ${!editing && !saving ? 'cursor-pointer hover:bg-blue-50/40' : ''}`}
      onClick={() => !editing && !saving && setEditing(true)}
    >
      {editing ? (
        <div className="relative">
          {inputType === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              className={EDIT_INPUT_CLS}
            >
              {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : inputType === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              rows={3}
              className={`${EDIT_INPUT_CLS} resize-none`}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              maxLength={maxLength}
              className={EDIT_INPUT_CLS}
            />
          )}
          {saving && <Loader2 size={9} className="absolute -top-1 -right-1 animate-spin text-navy-500" />}
        </div>
      ) : (
        <div className={`min-h-[20px] flex items-center ${viewClassName ?? ''}`}>
          {saving
            ? <Loader2 size={10} className="animate-spin text-navy-400" />
            : (displayNode ?? (value
                ? <span className="truncate block max-w-full">{value}</span>
                : <span className="text-gray-300">—</span>))
          }
        </div>
      )}
    </td>
  );
}

// ── Featured toggle cell ───────────────────────────────────────

export function FeaturedCell({
  featured,
  onSave,
}: {
  featured: boolean;
  onSave: (newValue: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try { await onSave(!featured); }
    finally { setSaving(false); }
  }

  return (
    <td className="px-3 py-1 text-center">
      <button onClick={handleToggle} disabled={saving} className="disabled:opacity-50 mx-auto block">
        {saving
          ? <Loader2 size={12} className="animate-spin text-gray-400" />
          : featured
            ? <Star size={14} className="text-amber-500 fill-amber-400" />
            : <Star size={14} className="text-gray-200 hover:text-amber-300 transition-colors" />
        }
      </button>
    </td>
  );
}

// ── Column filter popover ──────────────────────────────────────

export function ColumnFilter({
  options,
  selected,
  onChange,
  searchable = false,
}: {
  options: { label: string; value: string }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const active = selected.size > 0;
  const filtered = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${
          active ? 'text-navy-600' : 'text-gray-300 hover:text-gray-500'
        }`}
        title={active ? `${selected.size} filter${selected.size > 1 ? 's' : ''} active` : 'Filter'}
      >
        <ListFilter size={10} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1"
          style={{ minWidth: 140, maxHeight: 260, overflowY: 'auto' }}
        >
          {searchable && (
            <div className="px-2 pb-1 border-b border-gray-100 mb-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                autoFocus
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy-300"
              />
            </div>
          )}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No options</p>
          )}

          {filtered.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs text-gray-700 whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(opt.value);
                  else next.delete(opt.value);
                  onChange(next);
                }}
                className="w-3 h-3 accent-navy-900"
              />
              {opt.label}
            </label>
          ))}

          {active && (
            <button
              onClick={() => onChange(new Set())}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sortable header cell ───────────────────────────────────────

export function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
  filter,
  className,
}: {
  label: string;
  column: string;
  sortConfig: { key: string; dir: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  filter?: {
    options: { label: string; value: string }[];
    selected: Set<string>;
    onChange: (s: Set<string>) => void;
    searchable?: boolean;
  };
  className?: string;
}) {
  const active = sortConfig?.key === column;
  const dir = active ? sortConfig!.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  const filterActive = (filter?.selected.size ?? 0) > 0;

  return (
    <th
      onClick={() => onSort(column)}
      className={`cursor-pointer select-none transition-colors whitespace-nowrap ${
        filterActive ? 'bg-blue-50/60 hover:bg-blue-100/60' : 'hover:bg-gray-100'
      } ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={10} className={active ? 'text-navy-600' : 'text-gray-300'} />
        {filter && (
          <ColumnFilter
            options={filter.options}
            selected={filter.selected}
            onChange={filter.onChange}
            searchable={filter.searchable}
          />
        )}
      </span>
    </th>
  );
}
