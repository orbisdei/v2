'use client';

import { useState, useEffect, useRef, useMemo, Fragment, type ReactNode } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Image as ImageIcon,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { syncLocationTags } from '@/lib/locationTags';
import MapViewDynamic from '@/components/MapViewDynamic';
import TagMultiSelect from '@/components/admin/TagMultiSelect';
import ImageUploader from '@/components/admin/ImageUploader';
import { buildImagesPayload, type LinkEntry, type ImageEntry } from '@/components/admin/SiteForm';
import type { Tag, CoordinateCandidate } from '@/lib/types';
import type { AdminSite } from './AdminClient';

interface PhotoResult {
  source: 'wikimedia' | 'unsplash';
  url: string;
  thumbnail_url: string;
  attribution: string;
  license: string;
  title?: string;
}

// ── Coordinate helpers ─────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceBadgeClass(meters: number): string {
  if (meters < 50) return 'bg-green-100 text-green-800';
  if (meters < 500) return 'bg-yellow-100 text-yellow-800';
  if (meters < 2000) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// ── Image entry helpers ────────────────────────────────────────

function siteImagesToEntries(images: AdminSite['images']): ImageEntry[] {
  return images.map((img) => ({
    id: crypto.randomUUID(),
    previewUrl: img.url,
    finalUrl: img.url,
    caption: img.caption ?? '',
    attribution: img.attribution ?? '',
    storage_type: img.storage_type,
    display_order: img.display_order,
    removed: false,
    isNew: false,
    uploading: false,
  }));
}

// ── Filter + sort types ────────────────────────────────────────

type FilterKey = 'all' | 'unverified' | 'missing_photos' | 'far_off';
type SortKey =
  | 'name'
  | 'native_name'
  | 'country'
  | 'region'
  | 'municipality'
  | 'coordinates_verified'
  | 'image_count'
  | 'interest'
  | 'featured';
type SortDir = 'asc' | 'desc';

interface SitesPanelProps {
  allSites: AdminSite[];
  allTags: Tag[];
  onTagCreated: (tag: Tag) => void;
  onToast: (msg: string) => void;
}

// ── Sort header cell ───────────────────────────────────────────

function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sortConfig: { key: SortKey; dir: SortDir } | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sortConfig?.key === column;
  const dir = active ? sortConfig!.dir : null;
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th
      onClick={() => onSort(column)}
      className={`cursor-pointer select-none hover:bg-gray-100 transition-colors whitespace-nowrap ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon size={10} className={active ? 'text-navy-600' : 'text-gray-300'} />
      </span>
    </th>
  );
}

// ── Inline edit cell ───────────────────────────────────────────

const EDIT_INPUT_CLS =
  'w-full border border-navy-400 rounded px-1.5 py-0.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy-300';

function InlineEditCell({
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

  // Keep draft in sync when not editing
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-focus + select on enter edit mode
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
    try {
      await onSave(final);
    } catch {
      setDraft(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

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

// ── Tags edit cell ─────────────────────────────────────────────

function TagsEditCell({
  site,
  allTags,
  tagMap,
  onTagCreated,
  onSave,
  onToast,
}: {
  site: AdminSite;
  allTags: Tag[];
  tagMap: Map<string, Tag>;
  onTagCreated: (tag: Tag) => void;
  onSave: (tagIds: string[]) => Promise<void>;
  onToast: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(site.tag_ids);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures in event handler
  const draftIdsRef = useRef<string[]>(site.tag_ids);
  const originalIdsRef = useRef<string[]>(site.tag_ids);
  const onSaveRef = useRef(onSave);
  const onToastRef = useRef(onToast);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onToastRef.current = onToast; }, [onToast]);

  // Sync draft with external changes when not editing
  useEffect(() => {
    if (editing) return;
    setDraftIds(site.tag_ids);
    draftIdsRef.current = site.tag_ids;
  }, [site.tag_ids, editing]);

  function startEditing() {
    originalIdsRef.current = site.tag_ids;
    draftIdsRef.current = site.tag_ids;
    setDraftIds(site.tag_ids);
    setEditing(true);
  }

  function handleChange(ids: string[]) {
    draftIdsRef.current = ids;
    setDraftIds(ids);
  }

  // Outside-click → close + save
  useEffect(() => {
    if (!editing) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      const current = draftIdsRef.current;
      const original = originalIdsRef.current;
      const changed =
        JSON.stringify([...current].sort()) !== JSON.stringify([...original].sort());
      setEditing(false);
      if (!changed) return;
      setSaving(true);
      onSaveRef.current(current)
        .then(() => setSaving(false))
        .catch((err) => {
          setDraftIds(original);
          draftIdsRef.current = original;
          onToastRef.current('Error saving tags: ' + (err instanceof Error ? err.message : 'Failed'));
          setSaving(false);
        });
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [editing]);

  const displayTags = site.tag_ids.map((id) => tagMap.get(id)).filter((t) => t?.type === 'topic') as Tag[];

  return (
    <td
      className={`px-3 py-1 ${!editing && !saving ? 'cursor-pointer hover:bg-blue-50/40' : ''}`}
      onClick={() => !editing && !saving && startEditing()}
    >
      {editing ? (
        <div ref={containerRef} className="relative min-w-[220px]" style={{ zIndex: 30 }}>
          <TagMultiSelect
            allTags={allTags}
            selectedIds={draftIds}
            onChange={handleChange}
            onTagCreated={onTagCreated}
            placeholder="Add tags…"
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1 min-h-[20px]">
          {saving ? (
            <Loader2 size={10} className="animate-spin text-navy-400 mt-1" />
          ) : (
            <>
              {displayTags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
              {displayTags.length > 3 && (
                <span className="text-[10px] text-gray-400 self-center">+{displayTags.length - 3}</span>
              )}
              {displayTags.length === 0 && <span className="text-[10px] text-gray-300">—</span>}
            </>
          )}
        </div>
      )}
    </td>
  );
}

// ── Featured toggle cell ───────────────────────────────────────

function FeaturedCell({
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

// ── Main SitesPanel ────────────────────────────────────────────

const COL_COUNT = 12;

export default function SitesPanel({
  allSites: initialSites,
  allTags,
  onTagCreated,
  onToast,
}: SitesPanelProps) {
  const [sites, setSites] = useState<AdminSite[]>(initialSites);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir } | null>(null);

  // Coordinate candidates loaded per-site as user expands rows
  const [loadedCandidates, setLoadedCandidates] = useState<Record<string, CoordinateCandidate[]>>({});

  // Tag lookup map
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of allTags) map.set(tag.id, tag);
    return map;
  }, [allTags]);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    const unverified = sites.filter((s) => !s.coordinates_verified).length;
    const missingPhotos = sites.filter((s) => s.image_count === 0).length;
    let farOff = 0;
    for (const site of sites) {
      if (site.coordinates_verified) continue;
      const candidates = loadedCandidates[site.id] ?? [];
      if (
        candidates.some(
          (c) => haversineMeters(site.latitude, site.longitude, c.latitude, c.longitude) > 500
        )
      ) {
        farOff++;
      }
    }
    return { all: sites.length, unverified, missingPhotos, farOff };
  }, [sites, loadedCandidates]);

  // Filter + search + sort
  const visibleSites = useMemo(() => {
    let filtered = sites;

    if (activeFilter === 'unverified') {
      filtered = filtered.filter((s) => !s.coordinates_verified);
    } else if (activeFilter === 'missing_photos') {
      filtered = filtered.filter((s) => s.image_count === 0);
    } else if (activeFilter === 'far_off') {
      filtered = filtered.filter((s) => {
        if (s.coordinates_verified) return false;
        const candidates = loadedCandidates[s.id] ?? [];
        return candidates.some(
          (c) => haversineMeters(s.latitude, s.longitude, c.latitude, c.longitude) > 500
        );
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.country ?? '').toLowerCase().includes(q) ||
          (s.municipality ?? '').toLowerCase().includes(q)
      );
    }

    if (sortConfig) {
      const { key, dir } = sortConfig;
      filtered = [...filtered].sort((a, b) => {
        let cmp = 0;
        switch (key) {
          case 'name': cmp = a.name.localeCompare(b.name); break;
          case 'native_name': cmp = (a.native_name ?? '').localeCompare(b.native_name ?? ''); break;
          case 'country': cmp = (a.country ?? '').localeCompare(b.country ?? ''); break;
          case 'region': cmp = (a.region ?? '').localeCompare(b.region ?? ''); break;
          case 'municipality': cmp = (a.municipality ?? '').localeCompare(b.municipality ?? ''); break;
          case 'coordinates_verified': cmp = (a.coordinates_verified ? 1 : 0) - (b.coordinates_verified ? 1 : 0); break;
          case 'image_count': cmp = a.image_count - b.image_count; break;
          case 'interest': cmp = (a.interest ?? '').localeCompare(b.interest ?? ''); break;
          case 'featured': cmp = (a.featured ? 1 : 0) - (b.featured ? 1 : 0); break;
        }
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  }, [sites, activeFilter, searchQuery, loadedCandidates, sortConfig]);

  function toggleSort(key: SortKey) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  function handleSiteUpdated(updated: AdminSite) {
    setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setExpandedId(null);
  }

  function handleCandidatesLoaded(siteId: string, candidates: CoordinateCandidate[]) {
    setLoadedCandidates((prev) => ({ ...prev, [siteId]: candidates }));
  }

  // ── Inline save helpers ───────────────────────────────────────

  async function saveSiteField(siteId: string, field: string, value: unknown) {
    const supabase = createClient();
    const { error } = await supabase.from('sites').update({ [field]: value }).eq('id', siteId);
    if (error) throw new Error(error.message);
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, [field]: value } : s)));
    onToast('Saved ✓');
  }

  async function saveSiteLocation(
    siteId: string,
    field: 'country' | 'region' | 'municipality',
    rawValue: string,
  ) {
    const supabase = createClient();
    const site = sites.find((s) => s.id === siteId);
    if (!site) return;
    const value = rawValue.trim() || null;
    const { error } = await supabase.from('sites').update({ [field]: value }).eq('id', siteId);
    if (error) throw new Error(error.message);
    const newCountry = field === 'country' ? value : (site.country ?? null);
    const newRegion = field === 'region' ? value : (site.region ?? null);
    const newMunicipality = field === 'municipality' ? value : (site.municipality ?? null);
    // Sync location tags (best-effort — don't block save on failure)
    syncLocationTags(supabase, siteId, newCountry, newRegion, newMunicipality).catch(() => {});
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, [field]: value ?? undefined } : s))
    );
    onToast('Saved ✓');
  }

  async function saveSiteTags(siteId: string, newTagIds: string[]) {
    const supabase = createClient();
    const site = sites.find((s) => s.id === siteId);
    if (!site) return;
    const removed = site.tag_ids.filter((id) => !newTagIds.includes(id));
    const added = newTagIds.filter((id) => !site.tag_ids.includes(id));
    if (removed.length > 0) {
      const { error } = await supabase
        .from('site_tag_assignments')
        .delete()
        .eq('site_id', siteId)
        .in('tag_id', removed);
      if (error) throw new Error(error.message);
    }
    if (added.length > 0) {
      const { error } = await supabase
        .from('site_tag_assignments')
        .insert(added.map((tag_id) => ({ site_id: siteId, tag_id })));
      if (error) throw new Error(error.message);
    }
    setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, tag_ids: newTagIds } : s)));
    onToast('Tags saved ✓');
  }

  const filterPills: { key: FilterKey; label: string; count: number | string }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'unverified', label: 'Unverified coords', count: counts.unverified },
    { key: 'missing_photos', label: 'Missing photos', count: counts.missingPhotos },
    {
      key: 'far_off',
      label: 'Coords >500m off',
      count: counts.farOff > 0 ? counts.farOff : '–',
    },
  ];

  const showBulkBar = activeFilter === 'unverified' || activeFilter === 'far_off';

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-xl font-bold text-navy-900">Sites</h2>

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
          placeholder="Search sites…"
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

      {/* Contextual bulk action bar */}
      {showBulkBar && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-xs text-gray-500 mr-2">Bulk actions:</span>
          <button className="bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors">
            Auto-accept all &lt;50m
          </button>
          <button className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <Download size={12} /> Fetch Google Places
          </button>
          <button className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
            <Download size={12} /> Fetch OpenCage
          </button>
        </div>
      )}

      {/* Sites table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed" style={{ minWidth: 1080 }}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide font-medium">
              <th className="w-8 px-2 py-2" />
              <SortableHeader label="Site Name" column="name" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 min-w-[150px]" />
              <SortableHeader label="Native Name" column="native_name" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 min-w-[130px]" />
              <SortableHeader label="CC" column="country" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-14" />
              <SortableHeader label="Region" column="region" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 min-w-[100px]" />
              <SortableHeader label="Municipality" column="municipality" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 min-w-[110px]" />
              <th className="text-left px-3 py-2 min-w-[130px]">Tags</th>
              <th className="text-left px-3 py-2 min-w-[180px]">Description</th>
              <SortableHeader label="Coords" column="coordinates_verified" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-28" />
              <SortableHeader label="Photos" column="image_count" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-20" />
              <SortableHeader label="Interest" column="interest" sortConfig={sortConfig} onSort={toggleSort} className="text-left px-3 py-2 w-24" />
              <SortableHeader label="★" column="featured" sortConfig={sortConfig} onSort={toggleSort} className="text-center px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {visibleSites.length === 0 && (
              <tr>
                <td colSpan={COL_COUNT} className="text-sm text-gray-500 py-8 text-center">
                  No sites match this filter.
                </td>
              </tr>
            )}

            {visibleSites.map((site) => {
              const isExpanded = expandedId === site.id;
              return (
                <Fragment key={site.id}>
                  <tr
                    className={`border-b border-gray-50 last:border-b-0 transition-colors ${
                      isExpanded ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Expand chevron */}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : site.id)}
                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>

                    {/* Site Name — inline editable */}
                    <InlineEditCell
                      value={site.name}
                      displayNode={
                        <span className="font-medium text-navy-900 text-sm block truncate">
                          {site.name}
                        </span>
                      }
                      onSave={(v) => saveSiteField(site.id, 'name', v.trim() || site.name)}
                    />

                    {/* Native Name — inline editable */}
                    <InlineEditCell
                      value={site.native_name ?? ''}
                      displayNode={
                        site.native_name
                          ? <span className="text-gray-500 italic text-xs block truncate">{site.native_name}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      onSave={(v) => saveSiteField(site.id, 'native_name', v.trim() || null)}
                    />

                    {/* Country — inline editable, uppercase, 2-char */}
                    <InlineEditCell
                      value={site.country ?? ''}
                      displayNode={
                        site.country
                          ? <span className="font-mono text-xs text-gray-600">{site.country}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      maxLength={2}
                      transform={(v) => v.toUpperCase()}
                      tdClassName="w-14"
                      onSave={(v) => saveSiteLocation(site.id, 'country', v)}
                    />

                    {/* Region — inline editable */}
                    <InlineEditCell
                      value={site.region ?? ''}
                      displayNode={
                        site.region
                          ? <span className="text-xs text-gray-500 block truncate">{site.region}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      onSave={(v) => saveSiteLocation(site.id, 'region', v)}
                    />

                    {/* Municipality — inline editable */}
                    <InlineEditCell
                      value={site.municipality ?? ''}
                      displayNode={
                        site.municipality
                          ? <span className="text-xs text-gray-500 block truncate">{site.municipality}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      onSave={(v) => saveSiteLocation(site.id, 'municipality', v)}
                    />

                    {/* Tags — TagMultiSelect popover */}
                    <TagsEditCell
                      site={site}
                      allTags={allTags}
                      tagMap={tagMap}
                      onTagCreated={onTagCreated}
                      onSave={(ids) => saveSiteTags(site.id, ids)}
                      onToast={onToast}
                    />

                    {/* Description — inline editable textarea */}
                    <InlineEditCell
                      value={site.short_description}
                      displayNode={
                        site.short_description
                          ? <span className="text-xs text-gray-500 block truncate">{site.short_description}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                      inputType="textarea"
                      onSave={(v) => saveSiteField(site.id, 'short_description', v.trim())}
                    />

                    {/* Coords status — read-only */}
                    <td className="px-3 py-1 whitespace-nowrap">
                      {site.coordinates_verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                          <AlertCircle size={12} /> Unverified
                        </span>
                      )}
                    </td>

                    {/* Photos — read-only */}
                    <td className="px-3 py-1">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <ImageIcon size={12} />
                        {site.image_count}
                      </span>
                    </td>

                    {/* Interest — inline editable select */}
                    <InlineEditCell
                      value={site.interest ?? ''}
                      displayNode={
                        <span className="text-xs text-gray-500 capitalize">
                          {site.interest ?? <span className="text-gray-300">—</span>}
                        </span>
                      }
                      inputType="select"
                      options={[
                        { value: '', label: '— None —' },
                        { value: 'global', label: 'Global' },
                        { value: 'regional', label: 'Regional' },
                        { value: 'local', label: 'Local' },
                        { value: 'personal', label: 'Personal' },
                      ]}
                      tdClassName="w-24"
                      onSave={(v) => saveSiteField(site.id, 'interest', v || null)}
                    />

                    {/* Featured — immediate toggle */}
                    <FeaturedCell
                      featured={site.featured}
                      onSave={(v) => saveSiteField(site.id, 'featured', v)}
                    />
                  </tr>

                  {/* Expanded accordion row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={COL_COUNT} className="border-t border-gray-100 bg-gray-50 p-0">
                        <SiteAccordionEditor
                          site={site}
                          allTags={allTags}
                          onTagCreated={onTagCreated}
                          candidates={loadedCandidates[site.id] ?? null}
                          onCandidatesLoaded={(c) => handleCandidatesLoaded(site.id, c)}
                          onSaved={handleSiteUpdated}
                          onCancel={() => setExpandedId(null)}
                          onToast={onToast}
                        />
                      </td>
                    </tr>
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

// ── Accordion Editor ───────────────────────────────────────────

interface SiteAccordionEditorProps {
  site: AdminSite;
  allTags: Tag[];
  onTagCreated: (tag: Tag) => void;
  candidates: CoordinateCandidate[] | null; // null = not yet loaded
  onCandidatesLoaded: (candidates: CoordinateCandidate[]) => void;
  onSaved: (updated: AdminSite) => void;
  onCancel: () => void;
  onToast: (msg: string) => void;
}

function SiteAccordionEditor({
  site,
  allTags,
  onTagCreated,
  candidates,
  onCandidatesLoaded,
  onSaved,
  onCancel,
  onToast,
}: SiteAccordionEditorProps) {
  // Form state — only fields NOT covered by inline editing
  const [latitude, setLatitude] = useState(String(site.latitude));
  const [longitude, setLongitude] = useState(String(site.longitude));
  const [googleMapsUrl, setGoogleMapsUrl] = useState(site.google_maps_url);
  const [links, setLinks] = useState<LinkEntry[]>(
    site.links.map((l) => ({
      id: crypto.randomUUID(),
      link_type: l.link_type,
      url: l.url,
      comment: l.comment ?? '',
    }))
  );
  const [coordsVerified, setCoordsVerified] = useState(site.coordinates_verified ?? false);

  // Image state (managed via ImageUploader callback)
  const imagesRef = useRef<ImageEntry[]>(siteImagesToEntries(site.images));
  const [imageCount, setImageCount] = useState(site.images.length);

  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [markingVerified, setMarkingVerified] = useState(false);
  const [fetchingCoords, setFetchingCoords] = useState(false);

  // Photo search state
  const [photoSources, setPhotoSources] = useState<('wikimedia' | 'unsplash')[]>(['wikimedia']);
  const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
  const [photoResults, setPhotoResults] = useState<PhotoResult[] | null>(null);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<Set<string>>(new Set());
  const [attachingPhotos, setAttachingPhotos] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importUrlLoading, setImportUrlLoading] = useState(false);
  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // Images added via photo search (kept separate so ImageUploader isn't disrupted)
  const [searchAttachedImages, setSearchAttachedImages] = useState<ImageEntry[]>([]);

  // Fetch candidates on mount if not already loaded
  useEffect(() => {
    if (candidates !== null) return;
    setLoadingCandidates(true);
    const supabase = createClient();
    supabase
      .from('coordinate_candidates')
      .select('id, site_id, source, latitude, longitude, fetched_at')
      .eq('site_id', site.id)
      .then(({ data }) => {
        onCandidatesLoaded((data ?? []) as CoordinateCandidate[]);
        setLoadingCandidates(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIdx === null) return;
    const results = photoResults ?? [];
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => i !== null ? Math.min(i + 1, results.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photoResults]);

  // Build mini-map pins from current form coords + candidates
  const miniMapPins = useMemo(() => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const pins = [];
    if (!isNaN(lat) && !isNaN(lon)) {
      pins.push({
        id: 'current',
        name: 'Current',
        latitude: lat,
        longitude: lon,
        short_description: 'Current coordinates',
      });
    }
    for (const c of candidates ?? []) {
      pins.push({
        id: c.source,
        name: c.source === 'google_places' ? 'Google Places' : c.source === 'opencage' ? 'OpenCage' : 'Nominatim',
        latitude: c.latitude,
        longitude: c.longitude,
        short_description: c.source,
      });
    }
    return pins;
  }, [latitude, longitude, candidates]);

  // Links helpers
  function addLink() {
    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), link_type: '', url: '', comment: '' },
    ]);
  }
  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }
  function updateLink(id: string, field: keyof Omit<LinkEntry, 'id'>, value: string) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  // Mark verified directly via Supabase
  async function handleMarkVerified() {
    setMarkingVerified(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('sites')
      .update({ coordinates_verified: true })
      .eq('id', site.id);
    setMarkingVerified(false);
    if (error) {
      onToast('Error: ' + error.message);
      return;
    }
    setCoordsVerified(true);
    onToast('Marked verified ✓');
  }

  // Fetch external coords via /api/admin/fetch-coordinates
  async function handleFetchCoords() {
    setFetchingCoords(true);
    try {
      const res = await fetch('/api/admin/fetch-coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_ids: [site.id] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fetch failed');
      }
      const data = await res.json();
      const siteResult = (data.results as { site_id: string; candidates: CoordinateCandidate[] }[])?.find(
        (r) => r.site_id === site.id
      );
      if (siteResult?.candidates?.length) {
        onCandidatesLoaded(siteResult.candidates);
        onToast(`Fetched ${siteResult.candidates.length} coordinate source(s)`);
      } else {
        onToast('No results returned — check API key configuration');
      }
    } catch (err) {
      onToast('Error: ' + (err instanceof Error ? err.message : 'Fetch failed'));
    } finally {
      setFetchingCoords(false);
    }
  }

  // Photo search
  async function handlePhotoSearch() {
    if (photoSources.length === 0) return;
    setPhotoSearchLoading(true);
    setPhotoResults(null);
    try {
      const res = await fetch('/api/admin/search-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: site.id,
          query: [site.name, site.municipality].filter(Boolean).join(' '),
          sources: photoSources,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }
      const data = await res.json();
      setPhotoResults(data.results ?? []);
    } catch (err) {
      onToast('Photo search error: ' + (err instanceof Error ? err.message : 'Error'));
    } finally {
      setPhotoSearchLoading(false);
    }
  }

  async function handleAttachSelected() {
    if (selectedPhotoUrls.size === 0) return;
    setAttachingPhotos(true);
    let attached = 0;
    for (const url of selectedPhotoUrls) {
      const photo = photoResults?.find((p) => p.url === url);
      try {
        const res = await fetch('/api/import-image-from-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, entity_type: 'site', entity_id: site.id }),
        });
        if (res.ok) {
          const data = await res.json();
          const newEntry: ImageEntry = {
            id: crypto.randomUUID(),
            previewUrl: data.url,
            finalUrl: data.url,
            caption: '',
            attribution: data.attribution ?? photo?.attribution ?? '',
            storage_type: 'local',
            display_order:
              imagesRef.current.filter((i) => !i.removed).length +
              searchAttachedImages.length +
              attached,
            removed: false,
            isNew: true,
            uploading: false,
          };
          setSearchAttachedImages((prev) => [...prev, newEntry]);
          attached++;
        }
      } catch {
        // Skip individual failures
      }
    }
    setSelectedPhotoUrls(new Set());
    setImageCount((prev) => prev + attached);
    onToast(`${attached} photo${attached !== 1 ? 's' : ''} attached`);
    setAttachingPhotos(false);
  }

  async function handleImportUrl() {
    const trimmed = importUrl.trim();
    if (!trimmed) return;
    setImportUrlLoading(true);
    try {
      const res = await fetch('/api/import-image-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, entity_type: 'site', entity_id: site.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }
      const data = await res.json();
      const newEntry: ImageEntry = {
        id: crypto.randomUUID(),
        previewUrl: data.url,
        finalUrl: data.url,
        caption: '',
        attribution: data.attribution ?? '',
        storage_type: 'local',
        display_order:
          imagesRef.current.filter((i) => !i.removed).length + searchAttachedImages.length,
        removed: false,
        isNew: true,
        uploading: false,
      };
      setSearchAttachedImages((prev) => [...prev, newEntry]);
      setImageCount((prev) => prev + 1);
      setImportUrl('');
      onToast('Photo imported');
    } catch (err) {
      onToast('Import error: ' + (err instanceof Error ? err.message : 'Error'));
    } finally {
      setImportUrlLoading(false);
    }
  }

  // Save via publish-site-edit
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const currentImages = [...imagesRef.current, ...searchAttachedImages];
      const payload = {
        site_id: site.id,
        // Inline-editable fields: use the current site prop (already saved separately)
        name: site.name,
        native_name: site.native_name ?? null,
        country: site.country ?? null,
        region: site.region ?? null,
        municipality: site.municipality ?? null,
        short_description: site.short_description,
        interest: site.interest ?? null,
        tag_ids: site.tag_ids,
        // Fields managed by this form
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        google_maps_url: googleMapsUrl.trim(),
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || null })),
        images: buildImagesPayload(currentImages),
      };

      const res = await fetch('/api/publish-site-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      // If coords changed and we accepted a candidate, also mark verified
      const latChanged = parseFloat(latitude) !== site.latitude;
      const lonChanged = parseFloat(longitude) !== site.longitude;
      const isNowVerified = coordsVerified || (latChanged || lonChanged);
      if (isNowVerified && !site.coordinates_verified) {
        const supabase = createClient();
        await supabase
          .from('sites')
          .update({ coordinates_verified: true })
          .eq('id', site.id);
      }

      const newImageCount = buildImagesPayload(currentImages).length;
      const updatedSite: AdminSite = {
        ...site,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        google_maps_url: googleMapsUrl.trim(),
        coordinates_verified: isNowVerified,
        image_count: newImageCount,
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || undefined })),
        images: buildImagesPayload(currentImages).map((img) => ({
          ...img,
          storage_type: (img.storage_type ?? 'local') as 'local' | 'external',
        })),
      };
      onSaved(updatedSite);
      onToast('Saved ✓');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';
  const sectionHdr = 'flex items-center gap-2 mb-3';
  const sectionHdrLabel = 'text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0';

  return (
    <div className="border-t border-gray-200">

      {/* ── 50/50 split: form left, map right ───────────────── */}
      <div className="grid grid-cols-2 divide-x divide-gray-100">

        {/* LEFT — coordinates, Google Maps URL, links, save */}
        <div className="px-6 py-5 flex flex-col gap-5 bg-gray-50/60">

          {/* Coordinates */}
          <div>
            <div className={sectionHdr}>
              <span className={sectionHdrLabel}>Coordinates</span>
              {coordsVerified && (
                <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold">
                  <CheckCircle2 size={12} /> Verified
                </span>
              )}
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Latitude</label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>Longitude</label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

            {/* Geocoding comparison (always shown, action buttons only when unverified) */}
            <div className="mt-3 flex flex-col gap-3">
              {loadingCandidates && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading coordinate candidates…
                </p>
              )}

              {!loadingCandidates && (
                <div className="flex flex-wrap gap-2">
                  {/* Current pin card */}
                  <div className="border border-gray-200 rounded-lg p-2.5 bg-white min-w-[140px]">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      Current
                    </div>
                    <div className="font-mono text-xs text-gray-700">{site.latitude.toFixed(6)}</div>
                    <div className="font-mono text-xs text-gray-700">{site.longitude.toFixed(6)}</div>
                  </div>

                  {/* Candidate cards */}
                  {(candidates ?? []).map((c) => {
                    const dist = haversineMeters(
                      parseFloat(latitude) || site.latitude,
                      parseFloat(longitude) || site.longitude,
                      c.latitude,
                      c.longitude
                    );
                    const isActive =
                      parseFloat(latitude) === c.latitude &&
                      parseFloat(longitude) === c.longitude;
                    return (
                      <button
                        key={c.source}
                        onClick={() => {
                          setLatitude(String(c.latitude));
                          setLongitude(String(c.longitude));
                        }}
                        title="Click to use these coordinates"
                        className={`border rounded-lg p-2.5 bg-white min-w-[140px] text-left transition-colors hover:border-navy-400 hover:shadow-sm ${
                          isActive ? 'border-navy-500 ring-1 ring-navy-300' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            {c.source === 'google_places'
                              ? 'Google'
                              : c.source === 'opencage'
                              ? 'OpenCage'
                              : 'Nominatim'}
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${distanceBadgeClass(dist)}`}>
                            {formatDistance(dist)}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-gray-700">{c.latitude.toFixed(6)}</div>
                        <div className="font-mono text-xs text-gray-700">{c.longitude.toFixed(6)}</div>
                      </button>
                    );
                  })}

                  {(candidates ?? []).length === 0 && (
                    <p className="text-xs text-gray-400 self-center">
                      No cached candidates — fetch to compare.
                    </p>
                  )}
                </div>
              )}

              {/* Coord action buttons */}
              <div className="flex flex-wrap gap-2">
                {(candidates ?? []).length > 0 && (() => {
                  const best = [...(candidates ?? [])].sort(
                    (a, b) =>
                      haversineMeters(site.latitude, site.longitude, a.latitude, a.longitude) -
                      haversineMeters(site.latitude, site.longitude, b.latitude, b.longitude)
                  )[0];
                  return (
                    <button
                      onClick={() => {
                        setLatitude(String(best.latitude));
                        setLongitude(String(best.longitude));
                      }}
                      className="bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors"
                    >
                      Accept best match
                    </button>
                  );
                })()}
                <button
                  onClick={handleFetchCoords}
                  disabled={fetchingCoords}
                  className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {fetchingCoords ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Fetch external coords
                </button>
                {!coordsVerified && (
                  <button
                    onClick={handleMarkVerified}
                    disabled={markingVerified}
                    className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {markingVerified ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Mark verified
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Google Maps URL */}
          <div>
            <label className={labelCls}>Google Maps URL</label>
            <input
              type="text"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Links */}
          <div>
            <div className={sectionHdr}>
              <span className={sectionHdrLabel}>Links</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            <div className="flex flex-col gap-3">
              {links.map((link) => (
                <div key={link.id} className="flex flex-col gap-1.5">
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="e.g. Official Website…"
                      value={link.link_type}
                      onChange={(e) => updateLink(link.id, 'link_type', e.target.value)}
                      className={`${inputCls} w-[170px] shrink-0`}
                      aria-label="Link type"
                    />
                    <input
                      type="url"
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                      className={`${inputCls} flex-1 font-mono`}
                      aria-label="Link URL"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      className="mt-1.5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
                      aria-label="Remove link"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Optional comment…"
                    value={link.comment}
                    onChange={(e) => updateLink(link.id, 'comment', e.target.value)}
                    className={inputCls}
                    aria-label="Link comment"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addLink}
                className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
              >
                <Plus size={14} /> Add link
              </button>
            </div>
          </div>

          {/* Save bar */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            {saveError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5 mb-3">
                <AlertCircle size={14} /> {saveError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-gray-400 select-all truncate">{site.id}</span>
              <div className="flex-1" />
              <button
                onClick={onCancel}
                className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-navy-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Leaflet map */}
        <div className="p-4 bg-white flex flex-col">
          {miniMapPins.length > 0 ? (
            <div
              className="rounded-lg overflow-hidden border border-gray-200 flex-1"
              style={{ minHeight: 400 }}
            >
              <MapViewDynamic
                pins={miniMapPins}
                highlightedSiteId="current"
                initialFitBounds={miniMapPins.length > 1}
                initialCenter={[
                  parseFloat(latitude) || site.latitude,
                  parseFloat(longitude) || site.longitude,
                ]}
                initialZoom={14}
                minZoom={4}
              />
            </div>
          ) : (
            <div
              className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400"
              style={{ minHeight: 400 }}
            >
              No coordinates set
            </div>
          )}
        </div>
      </div>

      {/* ── Full-width images strip ───────────────────────────── */}
      <div className="border-t border-gray-200 bg-white px-6 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0">
            Photos{' '}
            <span className="font-normal text-gray-400 normal-case tracking-normal">({imageCount})</span>
          </span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <ImageUploader
          mode="site"
          entityId={site.id}
          initialImages={siteImagesToEntries(site.images)}
          onImagesChange={(imgs, _anyUploading) => {
            imagesRef.current = imgs;
            setImageCount(imgs.filter((i) => !i.removed).length + searchAttachedImages.length);
          }}
        />

        {/* Photo search */}
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {(['wikimedia', 'unsplash'] as const).map((src) => (
                <label key={src} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={photoSources.includes(src)}
                    onChange={(e) =>
                      setPhotoSources((prev) =>
                        e.target.checked ? [...prev, src] : prev.filter((s) => s !== src)
                      )
                    }
                    className="w-3 h-3"
                  />
                  {src === 'wikimedia' ? 'Wikimedia' : 'Unsplash'}
                </label>
              ))}
            </div>
            <button
              onClick={handlePhotoSearch}
              disabled={photoSearchLoading || photoSources.length === 0}
              className="inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-60"
            >
              {photoSearchLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              Search for &quot;{site.name}&quot;
            </button>
          </div>

          {photoResults !== null && (
            <>
              {photoResults.length === 0 ? (
                <p className="text-xs text-gray-400">No results found.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                  {photoResults.map((photo, i) => {
                    const isSelected = selectedPhotoUrls.has(photo.url);
                    return (
                      <div key={i} className="relative group">
                        <button
                          onClick={() =>
                            setSelectedPhotoUrls((prev) => {
                              const next = new Set(prev);
                              if (next.has(photo.url)) next.delete(photo.url);
                              else next.add(photo.url);
                              return next;
                            })
                          }
                          title={photo.title ?? photo.attribution}
                          className={`relative w-full overflow-hidden rounded-lg border-2 transition-all block ${
                            isSelected
                              ? 'border-navy-500 ring-1 ring-navy-300'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumbnail_url}
                            alt={photo.title ?? ''}
                            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-150"
                          />
                          <span
                            className={`absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded text-white ${
                              photo.source === 'wikimedia' ? 'bg-blue-600' : 'bg-amber-500'
                            }`}
                          >
                            {photo.source === 'wikimedia' ? 'WM' : 'UN'}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-navy-600 rounded-full flex items-center justify-center">
                              <CheckCircle2 size={10} className="text-white" />
                            </span>
                          )}
                        </button>
                        {/* Expand / lightbox button */}
                        <button
                          onClick={() => setLightboxIdx(i)}
                          className="absolute top-1 left-1 w-5 h-5 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View full size"
                        >
                          <Search size={10} className="text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedPhotoUrls.size > 0 && (
                <button
                  onClick={handleAttachSelected}
                  disabled={attachingPhotos}
                  className="inline-flex items-center gap-1.5 bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-60 self-start"
                >
                  {attachingPhotos ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Attach selected ({selectedPhotoUrls.size})
                </button>
              )}
            </>
          )}

          {/* Lightbox */}
          {lightboxIdx !== null && photoResults && (
            <div
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
              onClick={() => setLightboxIdx(null)}
            >
              <div
                className="relative bg-white rounded-xl shadow-2xl max-w-[80vw] max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close */}
                <button
                  onClick={() => setLightboxIdx(null)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  <X size={14} />
                </button>

                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoResults[lightboxIdx].url}
                  alt={photoResults[lightboxIdx].title ?? ''}
                  className="max-w-[80vw] max-h-[70vh] object-contain"
                />

                {/* Footer */}
                <div className="px-4 py-3 flex items-center gap-3 border-t border-gray-100 bg-white">
                  <div className="flex-1 min-w-0">
                    {photoResults[lightboxIdx].title && (
                      <p className="text-xs font-medium text-gray-700 truncate">{photoResults[lightboxIdx].title}</p>
                    )}
                    <p className="text-[10px] text-gray-500 truncate">{photoResults[lightboxIdx].attribution}</p>
                  </div>
                  <button
                    onClick={() => {
                      const photo = photoResults[lightboxIdx];
                      setSelectedPhotoUrls((prev) => {
                        const next = new Set(prev);
                        next.add(photo.url);
                        return next;
                      });
                      setLightboxIdx(null);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    <Plus size={12} /> Select
                  </button>
                </div>

                {/* Prev / Next arrows */}
                {lightboxIdx > 0 && (
                  <button
                    onClick={() => setLightboxIdx((i) => (i ?? 1) - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  >
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                )}
                {lightboxIdx < photoResults.length - 1 && (
                  <button
                    onClick={() => setLightboxIdx((i) => (i ?? 0) + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {searchAttachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchAttachedImages.map((img) => (
                <div key={img.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt="" className="w-16 h-16 object-cover rounded-lg border border-green-300" />
                  <button
                    onClick={() => {
                      setSearchAttachedImages((prev) => prev.filter((i) => i.id !== img.id));
                      setImageCount((prev) => prev - 1);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Import from URL…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
            />
            <button
              onClick={handleImportUrl}
              disabled={importUrlLoading || !importUrl.trim()}
              className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1"
            >
              {importUrlLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
