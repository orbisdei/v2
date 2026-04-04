'use client';

import { useState, useMemo, Fragment, type Dispatch, type SetStateAction } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ImageUploader from '@/components/admin/ImageUploader';
import type { ImageEntry } from '@/components/admin/SiteForm';
import { InlineEditCell, FeaturedCell, SortableHeader } from './shared';
import type { TagWithCount } from './AdminClient';

// ── Types ──────────────────────────────────────────────────────

type TagFilterKey = 'all' | 'topic' | 'location' | 'featured' | 'no_description' | 'no_image';
type TagSortKey = 'name' | 'type' | 'site_count' | 'featured';

const COL_COUNT = 11;

const TYPE_COLORS: Record<string, string> = {
  topic: 'bg-purple-100 text-purple-700',
  country: 'bg-blue-100 text-blue-700',
  region: 'bg-cyan-100 text-cyan-700',
  municipality: 'bg-teal-100 text-teal-700',
};

const TYPE_OPTIONS = [
  { value: 'topic', label: 'Topic' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'municipality', label: 'Municipality' },
];

// ── Expanded row ───────────────────────────────────────────────

function TagExpandedRow({
  tag,
  colCount,
  onUpdated,
  onDeleted,
  showToast,
}: {
  tag: TagWithCount;
  colCount: number;
  onUpdated: (t: TagWithCount) => void;
  onDeleted: (id: string) => void;
  showToast: (msg: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const isLocationTag = ['country', 'region', 'municipality'].includes(tag.type ?? '');

  async function handleDelete() {
    if (!window.confirm(`Delete tag "${tag.name || tag.id}"? This cannot be undone.`)) return;
    setDeleting(true);
    if (isLocationTag) {
      const supabase = createClient();
      const { error } = await supabase.from('tags').delete().eq('id', tag.id);
      if (error) { showToast('Error: ' + error.message); setDeleting(false); return; }
    } else {
      const res = await fetch('/api/delete-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tag.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast('Error: ' + (data.error || 'Delete failed'));
        setDeleting(false);
        return;
      }
    }
    onDeleted(tag.id);
    showToast('Tag deleted');
  }

  return (
    <tr className="border-b border-gray-100 bg-blue-50/20">
      <td colSpan={colCount} className="px-4 py-4">
        <div className="flex gap-6 items-start">
          {/* Image uploader */}
          <div className="shrink-0">
            <p className="text-xs text-gray-500 mb-1 font-medium">Hero image</p>
            <ImageUploader
              mode="tag"
              entityId={tag.id}
              initialImages={
                tag.image_url
                  ? [{ id: 'hero', previewUrl: tag.image_url, finalUrl: tag.image_url, caption: '', attribution: '', storage_type: 'local', display_order: 0, removed: false, isNew: false, uploading: false }]
                  : []
              }
              onImagesChange={async (entries: ImageEntry[], anyUploading: boolean) => {
                if (anyUploading) return;
                const kept = entries.filter((e) => !e.removed);
                const newUrl = kept[0]?.finalUrl ?? null;
                const supabase = createClient();
                const { error } = await supabase
                  .from('tags')
                  .update({ image_url: newUrl })
                  .eq('id', tag.id);
                if (error) { showToast('Error: ' + error.message); return; }
                onUpdated({ ...tag, image_url: newUrl ?? undefined });
                showToast('Image saved ✓');
              }}
            />
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-gray-400 uppercase tracking-wide text-[10px]">ID / Slug</span>
              <p className="font-mono text-gray-700 truncate">{tag.id}</p>
            </div>
            {tag.parent_tag_id && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-[10px]">Parent tag</span>
                <p className="font-mono text-gray-600 truncate">{tag.parent_tag_id}</p>
              </div>
            )}
            {tag.country_code && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-[10px]">Country code</span>
                <p className="font-mono text-gray-600">{tag.country_code}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400 uppercase tracking-wide text-[10px]">Sites using tag</span>
              <p className="text-gray-700 font-medium">{tag.site_count}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex flex-col gap-2">
            <a
              href={`/tag/${tag.id}/edit`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <ExternalLink size={11} /> Edit page
            </a>
            {tag.site_count === 0 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 text-xs border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                Delete
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main panel ─────────────────────────────────────────────────

interface TagsPanelProps {
  tags: TagWithCount[];
  setTags: Dispatch<SetStateAction<TagWithCount[]>>;
  showToast: (msg: string) => void;
}

export default function TagsPanel({ tags, setTags, showToast }: TagsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<TagFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: TagSortKey; dir: 'asc' | 'desc' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const counts = useMemo(() => ({
    all: tags.length,
    topic: tags.filter((t) => t.type === 'topic').length,
    location: tags.filter((t) => ['country', 'region', 'municipality'].includes(t.type ?? '')).length,
    featured: tags.filter((t) => t.featured).length,
    no_description: tags.filter((t) => !t.description?.trim()).length,
    no_image: tags.filter((t) => !t.image_url?.trim()).length,
  }), [tags]);

  const visibleTags = useMemo(() => {
    let filtered = tags;

    if (activeFilter === 'topic') filtered = filtered.filter((t) => t.type === 'topic');
    else if (activeFilter === 'location') filtered = filtered.filter((t) => ['country', 'region', 'municipality'].includes(t.type ?? ''));
    else if (activeFilter === 'featured') filtered = filtered.filter((t) => t.featured);
    else if (activeFilter === 'no_description') filtered = filtered.filter((t) => !t.description?.trim());
    else if (activeFilter === 'no_image') filtered = filtered.filter((t) => !t.image_url?.trim());

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.country_code ?? '').toLowerCase().includes(q)
      );
    }

    if (sortConfig) {
      const { key, dir } = sortConfig;
      filtered = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (key === 'name') cmp = (a.name ?? '').localeCompare(b.name ?? '');
        else if (key === 'type') cmp = (a.type ?? '').localeCompare(b.type ?? '');
        else if (key === 'site_count') cmp = a.site_count - b.site_count;
        else if (key === 'featured') cmp = (a.featured ? 1 : 0) - (b.featured ? 1 : 0);
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  }, [tags, activeFilter, searchQuery, sortConfig]);

  function toggleSort(key: string) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key: key as TagSortKey, dir: 'asc' };
      if (prev.dir === 'asc') return { key: key as TagSortKey, dir: 'desc' };
      return null;
    });
  }

  async function saveTagField(tagId: string, field: string, value: unknown) {
    const supabase = createClient();
    const { error } = await supabase.from('tags').update({ [field]: value }).eq('id', tagId);
    if (error) throw new Error(error.message);
    setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, [field]: value } : t)));
    showToast('Saved ✓');
  }

  async function handleDeleteOrphanedLocationTags() {
    const orphanedLocation = tags.filter(
      (t) => t.site_count === 0 && ['country', 'region', 'municipality'].includes(t.type ?? '')
    );
    if (orphanedLocation.length === 0) { showToast('No orphaned location tags found'); return; }
    if (!window.confirm(`Delete ${orphanedLocation.length} orphaned location tags? This cannot be undone.`)) return;

    setBulkDeleting(true);
    const typeOrder: Record<string, number> = { municipality: 0, region: 1, country: 2 };
    const ordered = [...orphanedLocation].sort(
      (a, b) => (typeOrder[a.type ?? ''] ?? 99) - (typeOrder[b.type ?? ''] ?? 99)
    );
    const supabase = createClient();
    const deletedIds = new Set<string>();
    for (const tag of ordered) {
      const { error } = await supabase.from('tags').delete().eq('id', tag.id);
      if (!error) deletedIds.add(tag.id);
    }
    setTags((prev) => prev.filter((t) => !deletedIds.has(t.id)));
    setBulkDeleting(false);
    showToast(`Deleted ${deletedIds.size} orphaned location tags`);
  }

  const filterPills: { key: TagFilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'topic', label: 'Topic', count: counts.topic },
    { key: 'location', label: 'Location', count: counts.location },
    { key: 'featured', label: 'Featured', count: counts.featured },
    { key: 'no_description', label: 'No description', count: counts.no_description },
    { key: 'no_image', label: 'No image', count: counts.no_image },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-bold text-navy-900">Tags</h2>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map((pill) => (
          <button
            key={pill.key}
            onClick={() => setActiveFilter(pill.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeFilter === pill.key
                ? 'bg-navy-900 text-white border-navy-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
            }`}
          >
            {pill.label}
            <span
              className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
                activeFilter === pill.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {pill.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags…"
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Orphaned bulk action */}
      {activeFilter === 'location' && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
          <button
            onClick={handleDeleteOrphanedLocationTags}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 border border-red-400 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete all orphaned location tags
          </button>
          <span className="text-xs text-gray-400">Safe reverse-hierarchy order</span>
        </div>
      )}

      {/* Tags table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: 980 }}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide font-medium">
              <th className="w-8 px-2 py-2" />
              <SortableHeader label="Tag Name" column="name" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 min-w-[160px]" />
              <th className="text-left px-3 py-2 min-w-[160px] font-medium">ID / Slug</th>
              <SortableHeader label="Type" column="type" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-28" />
              <th className="text-left px-3 py-2 w-20 font-medium">CC</th>
              <SortableHeader label="# Sites" column="site_count" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-16" />
              <th className="text-left px-3 py-2 min-w-[180px] font-medium">Description</th>
              <th className="text-left px-3 py-2 min-w-[140px] font-medium">Dedication</th>
              <th className="text-center px-3 py-2 w-14 font-medium">Img</th>
              <SortableHeader label="★" column="featured" sortConfig={sortConfig} onSort={toggleSort} className="text-center px-3 py-2 w-12" />
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibleTags.length === 0 && (
              <tr>
                <td colSpan={COL_COUNT} className="text-sm text-gray-500 py-8 text-center">
                  No tags match this filter.
                </td>
              </tr>
            )}

            {visibleTags.map((tag) => {
              const isExpanded = expandedId === tag.id;

              return (
                <Fragment key={tag.id}>
                  <tr
                    className={`border-b border-gray-50 last:border-b-0 transition-colors ${
                      isExpanded ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Expand */}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : tag.id)}
                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>

                    {/* Tag Name */}
                    <InlineEditCell
                      value={tag.name ?? ''}
                      displayNode={
                        tag.name
                          ? <span className="font-medium text-navy-900 text-sm block truncate">{tag.name}</span>
                          : <span className="text-gray-300 italic text-xs">unnamed</span>
                      }
                      onSave={(v) => saveTagField(tag.id, 'name', v.trim() || null)}
                    />

                    {/* ID / Slug — read-only */}
                    <td className="px-3 py-1">
                      <span className="font-mono text-xs text-gray-500 block truncate">{tag.id}</span>
                    </td>

                    {/* Type — editable select */}
                    <InlineEditCell
                      value={tag.type ?? ''}
                      inputType="select"
                      options={TYPE_OPTIONS}
                      displayNode={
                        tag.type
                          ? (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${TYPE_COLORS[tag.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {tag.type}
                            </span>
                          )
                          : <span className="text-gray-300">—</span>
                      }
                      onSave={(v) => saveTagField(tag.id, 'type', v || null)}
                    />

                    {/* Country Code */}
                    <InlineEditCell
                      value={tag.country_code ?? ''}
                      displayNode={
                        tag.country_code
                          ? <span className="font-mono text-xs text-gray-600 uppercase">{tag.country_code}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      maxLength={2}
                      transform={(v) => v.toUpperCase()}
                      onSave={(v) => saveTagField(tag.id, 'country_code', v.trim().toUpperCase() || null)}
                    />

                    {/* # Sites */}
                    <td className="px-3 py-1">
                      <span className={`text-xs font-medium ${tag.site_count === 0 ? 'text-gray-300' : 'text-gray-700'}`}>
                        {tag.site_count}
                      </span>
                    </td>

                    {/* Description */}
                    <InlineEditCell
                      value={tag.description ?? ''}
                      inputType="textarea"
                      displayNode={
                        tag.description
                          ? <span className="text-xs text-gray-600 block truncate">{tag.description}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      onSave={(v) => saveTagField(tag.id, 'description', v.trim() || null)}
                    />

                    {/* Dedication */}
                    <InlineEditCell
                      value={tag.dedication ?? ''}
                      displayNode={
                        tag.dedication
                          ? <span className="text-xs text-gray-600 block truncate">{tag.dedication}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      onSave={(v) => saveTagField(tag.id, 'dedication', v.trim() || null)}
                    />

                    {/* Has image */}
                    <td className="px-3 py-1 text-center">
                      {tag.image_url
                        ? <ImageIcon size={13} className="mx-auto text-green-600" />
                        : <span className="text-gray-200 text-xs">—</span>
                      }
                    </td>

                    {/* Featured */}
                    <FeaturedCell
                      featured={tag.featured ?? false}
                      onSave={(v) => saveTagField(tag.id, 'featured', v)}
                    />

                    {/* Link */}
                    <td className="px-2 py-1 text-center">
                      <a
                        href={`/tag/${tag.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-300 hover:text-navy-600 transition-colors"
                        title="View tag page"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>

                  {isExpanded && (
                    <TagExpandedRow
                      tag={tag}
                      colCount={COL_COUNT}
                      onUpdated={(updated) =>
                        setTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                      }
                      onDeleted={(id) => {
                        setTags((prev) => prev.filter((t) => t.id !== id));
                        setExpandedId(null);
                      }}
                      showToast={showToast}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
