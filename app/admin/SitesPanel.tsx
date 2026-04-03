'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
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

// ── Filter types ───────────────────────────────────────────────

type FilterKey = 'all' | 'unverified' | 'missing_photos' | 'far_off';

interface SitesPanelProps {
  allSites: AdminSite[];
  allTags: Tag[];
  onTagCreated: (tag: Tag) => void;
  onToast: (msg: string) => void;
}

// ── Main SitesPanel ────────────────────────────────────────────

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

  // Coordinate candidates loaded per-site as user expands rows
  const [loadedCandidates, setLoadedCandidates] = useState<Record<string, CoordinateCandidate[]>>({});

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

  // Filter + search
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

    return filtered;
  }, [sites, activeFilter, searchQuery, loadedCandidates]);

  function handleSiteUpdated(updated: AdminSite) {
    setSites((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setExpandedId(null);
  }

  function handleCandidatesLoaded(siteId: string, candidates: CoordinateCandidate[]) {
    setLoadedCandidates((prev) => ({ ...prev, [siteId]: candidates }));
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_10rem_7rem_8rem] gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide font-medium">
          <div />
          <div>Site</div>
          <div>Coords</div>
          <div>Photos</div>
          <div>Interest</div>
        </div>

        {visibleSites.length === 0 && (
          <p className="text-sm text-gray-500 py-8 text-center">No sites match this filter.</p>
        )}

        {visibleSites.map((site) => {
          const isExpanded = expandedId === site.id;
          return (
            <div key={site.id} className="border-b border-gray-50 last:border-b-0">
              {/* Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : site.id)}
                className="w-full grid grid-cols-[2rem_1fr_10rem_7rem_8rem] gap-2 px-4 py-3 items-center text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-navy-900 truncate">{site.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {[site.country, site.municipality].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div>
                  {site.coordinates_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                      <AlertCircle size={12} /> Unverified
                    </span>
                  )}
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <ImageIcon size={12} />
                    {site.image_count}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 capitalize">{site.interest ?? '—'}</span>
                </div>
              </button>

              {/* Expanded accordion editor */}
              {isExpanded && (
                <div className="col-span-full border-t border-gray-100 bg-gray-50">
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
                </div>
              )}
            </div>
          );
        })}
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
  // Form state
  const [name, setName] = useState(site.name);
  const [nativeName, setNativeName] = useState(site.native_name ?? '');
  const [country, setCountry] = useState(site.country ?? '');
  const [region, setRegion] = useState(site.region ?? '');
  const [municipality, setMunicipality] = useState(site.municipality ?? '');
  const [shortDescription, setShortDescription] = useState(site.short_description);
  const [latitude, setLatitude] = useState(String(site.latitude));
  const [longitude, setLongitude] = useState(String(site.longitude));
  const [googleMapsUrl, setGoogleMapsUrl] = useState(site.google_maps_url);
  const [interest, setInterest] = useState(site.interest ?? '');
  const [tagIds, setTagIds] = useState<string[]>(site.tag_ids);
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
          query: [name, municipality].filter(Boolean).join(' '),
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
        name: name.trim(),
        native_name: nativeName.trim() || null,
        country: country.toUpperCase().trim() || null,
        region: region.trim() || null,
        municipality: municipality.trim() || null,
        short_description: shortDescription.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        google_maps_url: googleMapsUrl.trim(),
        interest: interest || null,
        tag_ids: tagIds,
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
        name: name.trim(),
        native_name: nativeName.trim() || undefined,
        country: country.toUpperCase().trim() || undefined,
        region: region.trim() || undefined,
        municipality: municipality.trim() || undefined,
        short_description: shortDescription.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        google_maps_url: googleMapsUrl.trim(),
        interest: interest || undefined,
        tag_ids: tagIds,
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
  const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2';

  return (
    <div className="px-6 py-5 flex flex-col gap-5">
      {/* a. Name / Native name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Native name <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={nativeName}
            onChange={(e) => setNativeName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Basilique Sainte-Thérèse de Lisieux"
          />
        </div>
      </div>

      {/* b. Country / Region / Municipality */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Country code</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            placeholder="FR"
            className={`${inputCls} font-mono uppercase`}
          />
        </div>
        <div>
          <label className={labelCls}>Region</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={inputCls}
            placeholder="e.g. Lazio"
          />
        </div>
        <div>
          <label className={labelCls}>Municipality</label>
          <input
            type="text"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className={inputCls}
            placeholder="e.g. Rome"
          />
        </div>
      </div>

      {/* c. Short description */}
      <div>
        <label className={labelCls}>Short description</label>
        <textarea
          rows={2}
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* d. Coordinates section */}
      <div>
        <div className={sectionTitle}>
          <div className="flex-1 border-t border-gray-200" />
          <span className="shrink-0 flex items-center gap-1.5">
            Coordinates
            {coordsVerified && (
              <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold normal-case tracking-normal">
                <CheckCircle2 size={13} /> Verified
              </span>
            )}
          </span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <div className="flex flex-col gap-3">
          {/* Lat / Lng inputs */}
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

          {/* Source comparison cards (only when unverified) */}
          {!coordsVerified && (
            <>
              {loadingCandidates && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading coordinate candidates…
                </p>
              )}

              {!loadingCandidates && (
                <div className="flex flex-wrap gap-3">
                  {/* Current (import) card */}
                  <div className="border border-gray-200 rounded-lg p-3 bg-white min-w-[160px]">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Current (import)
                    </div>
                    <div className="font-mono text-xs text-gray-700">
                      {site.latitude.toFixed(6)}
                    </div>
                    <div className="font-mono text-xs text-gray-700">
                      {site.longitude.toFixed(6)}
                    </div>
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
                        className={`border rounded-lg p-3 bg-white min-w-[160px] text-left transition-colors hover:border-navy-400 hover:shadow-sm ${
                          isActive ? 'border-navy-500 ring-1 ring-navy-300' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            {c.source === 'google_places'
                              ? 'Google Places'
                              : c.source === 'opencage'
                              ? 'OpenCage'
                              : 'Nominatim'}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${distanceBadgeClass(dist)}`}
                          >
                            {formatDistance(dist)}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-gray-700">{c.latitude.toFixed(6)}</div>
                        <div className="font-mono text-xs text-gray-700">
                          {c.longitude.toFixed(6)}
                        </div>
                      </button>
                    );
                  })}

                  {(candidates ?? []).length === 0 && !loadingCandidates && (
                    <p className="text-xs text-gray-400 self-center">
                      No cached candidates — fetch to compare.
                    </p>
                  )}
                </div>
              )}

              {/* Mini-map */}
              {miniMapPins.length > 0 && (
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 120 }}>
                  <MapViewDynamic
                    pins={miniMapPins}
                    highlightedSiteId="current"
                    initialFitBounds={miniMapPins.length > 1}
                    initialCenter={[parseFloat(latitude) || site.latitude, parseFloat(longitude) || site.longitude]}
                    initialZoom={14}
                    minZoom={4}
                  />
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
                  {fetchingCoords ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Fetch external coords
                </button>
                <button
                  onClick={handleMarkVerified}
                  disabled={markingVerified}
                  className="border border-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {markingVerified ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  Mark verified (keep current)
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* e. Google Maps URL */}
      <div>
        <label className={labelCls}>Google Maps URL</label>
        <input
          type="text"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* f. Interest level */}
      <div>
        <label className={labelCls}>Interest level</label>
        <select
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className={inputCls}
        >
          <option value="">— Select —</option>
          {['global', 'regional', 'local', 'personal'].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {/* g. Tags */}
      <div>
        <label className={labelCls}>Tags</label>
        <TagMultiSelect
          allTags={allTags}
          selectedIds={tagIds}
          onChange={setTagIds}
          onTagCreated={onTagCreated}
          placeholder="Search or create tags…"
        />
      </div>

      {/* h. Links section */}
      <div>
        <div className={sectionTitle}>
          <div className="flex-1 border-t border-gray-200" />
          <span className="shrink-0">Links</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>
        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <div key={link.id} className="flex flex-col gap-1.5">
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  placeholder="e.g. Official Website, Wikipedia…"
                  value={link.link_type}
                  onChange={(e) => updateLink(link.id, 'link_type', e.target.value)}
                  className={`${inputCls} w-[200px] shrink-0`}
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
                placeholder="Optional comment about this link…"
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

      {/* i. Photos section */}
      <div>
        <div className={sectionTitle}>
          <div className="flex-1 border-t border-gray-200" />
          <span className="shrink-0">
            Photos{' '}
            <span className="font-normal text-gray-400 normal-case tracking-normal">
              ({imageCount})
            </span>
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

        {/* ── Photo Search ──────────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg p-3 bg-white flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Source checkboxes */}
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
              {photoSearchLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Search size={12} />
              )}
              Search for &quot;{name}&quot;
            </button>
          </div>

          {/* Results grid */}
          {photoResults !== null && (
            <>
              {photoResults.length === 0 ? (
                <p className="text-xs text-gray-400">No results found.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {photoResults.map((photo, i) => {
                    const isSelected = selectedPhotoUrls.has(photo.url);
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setSelectedPhotoUrls((prev) => {
                            const next = new Set(prev);
                            if (next.has(photo.url)) next.delete(photo.url);
                            else next.add(photo.url);
                            return next;
                          })
                        }
                        title={photo.title ?? photo.attribution}
                        className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                          isSelected ? 'border-navy-500' : 'border-transparent'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.title ?? ''}
                          className="w-16 h-16 object-cover"
                        />
                        <span
                          className={`absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 py-0.5 rounded text-white ${
                            photo.source === 'wikimedia' ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                        >
                          {photo.source === 'wikimedia' ? 'WM' : 'UN'}
                        </span>
                      </button>
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
                  {attachingPhotos ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  Attach selected ({selectedPhotoUrls.size})
                </button>
              )}
            </>
          )}

          {/* Attached-via-search list */}
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

          {/* Import URL */}
          <div className="flex gap-2 items-center">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="Import from URL…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
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

      {/* j. Save bar */}
      {saveError && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertCircle size={14} />
          {saveError}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
        <span className="font-mono text-xs text-gray-400 select-all">{site.id}</span>
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
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>
    </div>
  );
}
