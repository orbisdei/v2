'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { generateSiteId } from '@/lib/utils';
import { syncLocationTags } from '@/lib/locationTags';
import {
  SiteForm,
  SiteFormValues,
  EMPTY_SITE_FORM,
  LinkEntry,
  ImageEntry,
  buildImagesPayload,
} from '@/components/admin/SiteForm';
import TagMultiSelect from '@/components/admin/TagMultiSelect';
import type { Tag } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lon: number): Promise<{ country?: string; municipality?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'OrbisDeI/1.0 (orbisdei.org)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address ?? {};
    const countryCode = (addr.country_code as string)?.toUpperCase();
    const municipality = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    return { country: countryCode, municipality };
  } catch {
    return {};
  }
}

function buildDefaultPrompt(topic: string, region: string): string {
  return `List real, verifiable Catholic holy sites related to: "${topic}"${region ? ` in or near ${region}` : ''}.

Restrict yourself to sites which have direct connections to the topic. For example, if the topic is a saint, do not include shrines in honor of the saint. Only include places where the saint lived or is now buried.

For each site, provide: name, country, municipality, short_description, interest (global/regional/local/personal), official_website (if known), and wikipedia_url (if known).

Only include sites you are highly confident about.`;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ImportedSite {
  id: string;
  name: string;
  native_name?: string;
  country?: string;
  region?: string;
  municipality?: string;
  short_description: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  interest: string;
  links: Array<{ url: string; link_type: string; comment?: string }>;
  tag_ids: string[];
  status: 'new' | 'duplicate';
  duplicate_id: string | null;
}

function siteToEdit(site: ImportedSite): SiteFormValues {
  return {
    name: site.name,
    native_name: site.native_name ?? '',
    country: site.country ?? '',
    region: site.region ?? '',
    municipality: site.municipality ?? '',
    short_description: site.short_description,
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    google_maps_url: site.google_maps_url,
    interest: site.interest,
    image_url: '',
    tag_ids: site.tag_ids,
  };
}

function initLinksEdits(results: ImportedSite[]): Record<string, LinkEntry[]> {
  return Object.fromEntries(
    results.map((s) => [
      s.id,
      s.links.map((l) => ({
        id: crypto.randomUUID(),
        link_type: l.link_type,
        url: l.url,
        comment: l.comment ?? '',
      })),
    ])
  );
}

type Tab = 'create' | 'topic' | 'gmaps' | 'url' | 'manual';

interface ContributeClientProps {
  allTags: Tag[];
  userRole: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContributeClient({ allTags: initialTags, userRole }: ContributeClientProps) {
  const isAdmin = userRole === 'administrator';
  const [localTags, setLocalTags] = useState<Tag[]>(initialTags);

  function handleTagCreated(tag: Tag) {
    setLocalTags((prev) => [...prev, tag]);
  }

  // ── Tab state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('create');

  // ── Tab 1 (create single site) state ─────────────────────
  const [createStatus, setCreateStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [createLinks, setCreateLinks] = useState<LinkEntry[]>([
    { id: crypto.randomUUID(), url: '', link_type: 'Official Website', comment: '' },
  ]);
  const [contributorNote, setContributorNote] = useState('');
  const [createValues, setCreateValues] = useState<SiteFormValues>(EMPTY_SITE_FORM);
  const latestImages = useRef<ImageEntry[]>([]);
  const [anyUploading, setAnyUploading] = useState(false);

  function handleImagesChange(imgs: ImageEntry[], uploading: boolean) {
    latestImages.current = imgs;
    setAnyUploading(uploading);
  }

  function handleCreateChange(field: keyof SiteFormValues, value: string | string[]) {
    setCreateValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (anyUploading) return;
    setCreateStatus('submitting');
    setCreateErrorMsg('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreateStatus('error'); setCreateErrorMsg('You must be logged in.'); return; }

    const generatedId = generateSiteId(createValues.country, createValues.municipality, createValues.name);

    const payload = {
      name: createValues.name,
      native_name: createValues.native_name || null,
      country: createValues.country.toUpperCase() || null,
      region: createValues.region || null,
      municipality: createValues.municipality || null,
      generated_id: generatedId || null,
      short_description: createValues.short_description,
      latitude: parseFloat(createValues.latitude),
      longitude: parseFloat(createValues.longitude),
      google_maps_url: createValues.google_maps_url,
      interest: createValues.interest || null,
      tag_ids: createValues.tag_ids,
      links: createLinks
        .filter((l) => l.url.trim())
        .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || null })),
      images: buildImagesPayload(latestImages.current),
      contributor_note: contributorNote,
    };

    const { error } = await supabase.from('pending_submissions').insert({
      type: 'site',
      action: 'create',
      payload,
      submitted_by: user.id,
    });

    if (error) {
      setCreateStatus('error');
      setCreateErrorMsg(error.message);
    } else {
      setCreateStatus('success');
    }
  }

  // ── Import tabs: form state ───────────────────────────────
  const [topic, setTopic] = useState('');
  const [region, setRegion] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [autoTagIds, setAutoTagIds] = useState<string[]>([]);

  // ── Prompt state ──────────────────────────────────────────
  const [promptText, setPromptText] = useState(() => buildDefaultPrompt('', ''));
  const [promptEdited, setPromptEdited] = useState(false);

  useEffect(() => {
    if (!promptEdited) {
      setPromptText(buildDefaultPrompt(topic, region));
    }
  }, [topic, region, promptEdited]);

  function handlePromptChange(val: string) {
    setPromptText(val);
    setPromptEdited(true);
  }

  function resetPrompt() {
    setPromptText(buildDefaultPrompt(topic, region));
    setPromptEdited(false);
  }

  // ── Google Maps mode state ────────────────────────────────
  const [gmapsUrl, setGmapsUrl] = useState('');
  const [gmapsUrlError, setGmapsUrlError] = useState<string | null>(null);

  // ── Manual mode state ─────────────────────────────────────
  const [manualJson, setManualJson] = useState('');
  const [manualParseError, setManualParseError] = useState<string | null>(null);
  const [manualParsing, setManualParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function loadManualFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setManualJson((e.target?.result as string) ?? '');
      setManualParseError(null);
    };
    reader.readAsText(file);
  }

  async function handleManualParse() {
    if (!manualJson.trim()) return;
    setManualParsing(true);
    setManualParseError(null);
    try {
      const parsed = JSON.parse(manualJson);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

      const supabase = createClient();
      const { data: existingSites } = await supabase
        .from('sites')
        .select('id, name, latitude, longitude');
      const existing = existingSites ?? [];
      const usedSlugs = new Set(existing.map((e) => e.id as string));

      const results: ImportedSite[] = arr.map((item) => {
        const s = (item ?? {}) as Record<string, unknown>;
        const name = typeof s.name === 'string' ? s.name : '';
        const lat = typeof s.latitude === 'number' ? s.latitude : Number(s.latitude) || 0;
        const lon = typeof s.longitude === 'number' ? s.longitude : Number(s.longitude) || 0;

        const duplicate = existing.find(
          (e) => Math.abs((e.latitude as number) - lat) < 0.01 && Math.abs((e.longitude as number) - lon) < 0.01
        );

        let id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80)
          || `manual-${Math.random().toString(36).slice(2)}`;
        let counter = 2;
        while (usedSlugs.has(id)) { id = `${id}-${counter++}`; }
        usedSlugs.add(id);

        return {
          id,
          name,
          native_name: typeof s.native_name === 'string' ? s.native_name : undefined,
          country: typeof s.country === 'string' ? s.country.toUpperCase() : undefined,
          region: typeof s.region === 'string' ? s.region : undefined,
          municipality: typeof s.municipality === 'string' ? s.municipality : undefined,
          short_description: typeof s.short_description === 'string' ? s.short_description : '',
          latitude: lat,
          longitude: lon,
          google_maps_url: typeof s.google_maps_url === 'string' ? s.google_maps_url : '',
          interest: typeof s.interest === 'string' ? s.interest : '',
          links: Array.isArray(s.links) ? s.links : [],
          tag_ids: [...autoTagIds],
          status: duplicate ? 'duplicate' : 'new',
          duplicate_id: duplicate?.id ?? null,
        };
      });

      for (const site of results) {
        if (!site.country || !site.municipality) {
          const geo = await reverseGeocode(site.latitude, site.longitude);
          site.country = site.country || geo.country || '';
          site.municipality = site.municipality || geo.municipality || '';
          await new Promise((r) => setTimeout(r, 1100));
        }
      }

      setSites(results);
      setEdits({});
      setLinksEdits(initLinksEdits(results));
      setPublishedIds(new Set());
      setOverriddenIds(new Set());
      setPublishErrors({});
      setSiteImages({});
      setPublishedSiteIds({});
      setExpandedId(null);
    } catch {
      setManualParseError('Invalid JSON — please check your input');
      setSites([]);
    } finally {
      setManualParsing(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'manual') return;

    function onDragOver(e: DragEvent) {
      e.preventDefault();
      setIsDragging(true);
    }
    function onDragLeave(e: DragEvent) {
      if (!e.relatedTarget) setIsDragging(false);
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) loadManualFile(file);
    }

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Import loading / error ────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // ── Import results state ──────────────────────────────────
  const [sites, setSites] = useState<ImportedSite[]>([]);
  const [edits, setEdits] = useState<Record<string, SiteFormValues>>({});
  const [linksEdits, setLinksEdits] = useState<Record<string, LinkEntry[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [overriddenIds, setOverriddenIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});
  const [siteImages, setSiteImages] = useState<Record<string, ImageEntry[]>>({});
  const [publishedSiteIds, setPublishedSiteIds] = useState<Record<string, string>>({});
  const [enrichingCount, setEnrichingCount] = useState<number>(0);
  const [enrichedCount, setEnrichedCount] = useState<number>(0);

  // ── Import helpers ────────────────────────────────────────
  function getEdit(site: ImportedSite): SiteFormValues {
    return edits[site.id] ?? siteToEdit(site);
  }

  function updateEdit(siteId: string, field: keyof SiteFormValues, value: string | string[]) {
    const site = sites.find((s) => s.id === siteId)!;
    setEdits((prev) => ({ ...prev, [siteId]: { ...getEdit(site), [field]: value } }));
  }

  function getSiteLinks(siteId: string): LinkEntry[] {
    return linksEdits[siteId] ?? [];
  }

  function setSiteLinks(siteId: string, links: LinkEntry[]) {
    setLinksEdits((prev) => ({ ...prev, [siteId]: links }));
  }

  // ── Background coordinate enrichment ─────────────────────
  async function enrichCoordinates(sitesToEnrich: ImportedSite[]) {
    setEnrichingCount(sitesToEnrich.length);
    setEnrichedCount(0);

    for (const site of sitesToEnrich) {
      try {
        const res = await fetch('/api/enrich-site-coords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: site.name,
            municipality: site.municipality,
            country: site.country,
          }),
        });
        if (res.ok) {
          const data = await res.json();

          setSites(prev => prev.map(s =>
            s.id === site.id
              ? {
                  ...s,
                  latitude: data.latitude || s.latitude,
                  longitude: data.longitude || s.longitude,
                  country: data.country || s.country,
                  municipality: data.municipality || s.municipality,
                }
              : s
          ));

          setEdits(prev => {
            const existing = prev[site.id];
            if (!existing) return prev;
            return {
              ...prev,
              [site.id]: {
                ...existing,
                latitude: data.latitude ? String(data.latitude) : existing.latitude,
                longitude: data.longitude ? String(data.longitude) : existing.longitude,
                country: data.country || existing.country,
                municipality: data.municipality || existing.municipality,
              },
            };
          });
        }
      } catch {
        // Silently continue to next site
      }

      setEnrichedCount(prev => prev + 1);

      // Wait 2.2s between calls (endpoint makes 2 Nominatim calls internally)
      await new Promise(r => setTimeout(r, 2200));
    }

    setEnrichingCount(0);
    setEnrichedCount(0);
  }

  // ── Discover ──────────────────────────────────────────────
  async function handleDiscover() {
    if (activeTab === 'gmaps') {
      const isGMaps = /google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl/.test(gmapsUrl);
      if (!isGMaps) {
        setGmapsUrlError('Please enter a valid Google Maps link.');
        return;
      }
    }

    setLoading(true);
    setDiscoverError(null);
    try {
      let body: Record<string, unknown>;
      if (activeTab === 'topic') {
        body = { mode: 'topic', topic, region, autoTagIds, promptOverride: promptText };
      } else if (activeTab === 'url') {
        body = { mode: 'url', urls: urlsText.split('\n').map((u) => u.trim()).filter(Boolean), autoTagIds };
      } else {
        body = { mode: 'gmaps', input: gmapsUrl.trim(), autoTagIds };
      }

      const res = await fetch('/api/import-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'API error');

      setSites(data.sites);
      setEdits({});
      setLinksEdits(initLinksEdits(data.sites));
      setPublishedIds(new Set());
      setOverriddenIds(new Set());
      setPublishErrors({});
      setSiteImages({});
      setPublishedSiteIds({});
      if (activeTab === 'gmaps' && data.sites.length === 1) {
        setExpandedId(data.sites[0].id);
      } else {
        setExpandedId(null);
      }

      // Fire-and-forget background enrichment (topic/url modes only)
      if (activeTab !== 'gmaps') {
        enrichCoordinates(data.sites);
      }
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // ── Publish one site ──────────────────────────────────────
  async function publishSite(site: ImportedSite): Promise<void> {
    const edit = getEdit(site);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!edit.country || edit.country.trim().length !== 2) {
      throw new Error('Country code must be exactly 2 letters (e.g. FR, IT).');
    }
    if (!edit.municipality.trim()) {
      throw new Error('Municipality is required.');
    }

    const finalId = generateSiteId(edit.country, edit.municipality, edit.name);
    if (!finalId) throw new Error('Cannot generate a site ID — check country, municipality, and name.');

    const { data: existing } = await supabase
      .from('sites')
      .select('id')
      .eq('id', finalId)
      .maybeSingle();
    if (existing) {
      throw new Error(
        'A site with this ID already exists — check country, municipality, and name for duplicates.'
      );
    }

    const { error: siteErr } = await supabase.from('sites').insert({
      id: finalId,
      name: edit.name.trim(),
      native_name: edit.native_name.trim() || null,
      country: edit.country.toUpperCase().trim(),
      region: edit.region?.trim() || null,
      municipality: edit.municipality.trim(),
      short_description: edit.short_description.trim(),
      latitude: Number(edit.latitude),
      longitude: Number(edit.longitude),
      google_maps_url: edit.google_maps_url.trim(),
      interest: edit.interest || null,
      featured: false,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    if (siteErr) throw new Error(siteErr.message);

    const uploadedImages = (siteImages[site.id] ?? [])
      .filter((img) => !img.removed && img.finalUrl)
      .map((img, i) => ({
        site_id: finalId,
        url: img.finalUrl!,
        caption: img.caption || null,
        attribution: img.attribution || null,
        storage_type: 'local' as const,
        display_order: i,
      }));
    if (uploadedImages.length > 0) {
      const { error: imgErr } = await supabase.from('site_images').insert(uploadedImages);
      if (imgErr) throw new Error(imgErr.message);
    }

    const siteLinks = (linksEdits[site.id] ?? site.links.map((l) => ({
      id: '',
      link_type: l.link_type,
      url: l.url,
      comment: l.comment ?? '',
    }))).filter((l) => l.url.trim());
    if (siteLinks.length > 0) {
      await supabase.from('site_links').insert(
        siteLinks.map((l) => ({
          site_id: finalId,
          url: l.url,
          link_type: l.link_type,
          comment: l.comment || null,
        }))
      );
    }

    if (edit.tag_ids.length > 0) {
      await supabase.from('site_tag_assignments').insert(
        edit.tag_ids.map((tag_id) => ({ site_id: finalId, tag_id }))
      );
    }

    await syncLocationTags(
      supabase,
      finalId,
      edit.country?.toUpperCase() || null,
      edit.region?.trim() || null,
      edit.municipality?.trim() || null
    );
  }

  async function handlePublishOne(site: ImportedSite) {
    setPublishingId(site.id);
    setPublishErrors((prev) => ({ ...prev, [site.id]: '' }));
    try {
      await publishSite(site);
      setPublishedIds((prev) => new Set(prev).add(site.id));
      const edit = getEdit(site);
      const finalId = generateSiteId(edit.country, edit.municipality, edit.name);
      setPublishedSiteIds((prev) => ({ ...prev, [site.id]: finalId }));
    } catch (err) {
      setPublishErrors((prev) => ({
        ...prev,
        [site.id]: err instanceof Error ? err.message : 'Error publishing site',
      }));
    } finally {
      setPublishingId(null);
    }
  }

  // ── Google geocode fallback ───────────────────────────────
  async function handleGoogleGeocode(site: ImportedSite) {
    const edit = getEdit(site);
    try {
      const res = await fetch('/api/enrich-site-coords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: edit.name,
          municipality: edit.municipality,
          country: edit.country,
          source: 'google',
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.latitude) return;

      setSites(prev => prev.map(s =>
        s.id === site.id
          ? { ...s, latitude: data.latitude, longitude: data.longitude, country: data.country || s.country, municipality: data.municipality || s.municipality }
          : s
      ));
      setEdits(prev => ({
        ...prev,
        [site.id]: {
          ...getEdit(site),
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          country: data.country || edit.country,
          municipality: data.municipality || edit.municipality,
        },
      }));
    } catch {
      // Silently fail
    }
  }

  // ── Stats ─────────────────────────────────────────────────
  const newSites = sites.filter((s) => s.status === 'new');
  const duplicates = sites.filter((s) => s.status === 'duplicate');
  const enrichmentDone = enrichingCount === 0 && sites.length > 0;

  // ── Success screen (tab 1 only) ───────────────────────────
  if (createStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-4xl mb-4">✝</div>
          <h1 className="font-serif text-2xl font-bold text-navy-900 mb-3">Submission received</h1>
          <p className="text-gray-600 mb-6">
            Thank you. Your site submission is pending review by an administrator.
          </p>
          <Link href="/" className="text-sm text-navy-700 hover:text-navy-500 font-medium">
            ← Back to map
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  const TAB_LABELS: Record<Tab, string> = {
    create: 'Create Single Site',
    topic: 'Search by Topic',
    gmaps: 'Search by Maps URL',
    url: 'Search by Other URL',
    manual: 'Import via JSON',
  };

  const ADMIN_TABS: Tab[] = ['create', 'topic', 'gmaps', 'url', 'manual'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Drag-and-drop overlay (manual tab only) */}
      {activeTab === 'manual' && isDragging && (
        <div className="fixed inset-0 z-50 bg-navy-900/20 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl border-2 border-dashed border-navy-400 px-16 py-12 text-center shadow-xl">
            <Upload size={32} className="mx-auto mb-3 text-navy-400" />
            <p className="text-navy-900 font-medium">Drop your .json file here</p>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium mb-6">
        <ArrowLeft size={16} />
        Back to map
      </Link>

      {/* Page header */}
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-1">Contribute</h1>
      <p className="text-sm text-gray-500 mb-6">Add new holy sites to the map.</p>

      {/* Tab bar (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-navy-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab 1: Create Single Site ── */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white rounded-xl border border-gray-200 p-6">
          <SiteForm
            values={createValues}
            onChange={handleCreateChange}
            allTags={localTags}
            onTagCreated={handleTagCreated}
            links={createLinks}
            onLinksChange={setCreateLinks}
            showPhotoUpload
            onImagesChange={handleImagesChange}
          />

          {/* Contributor note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contributor note
            </label>
            <textarea
              value={contributorNote}
              onChange={(e) => setContributorNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none"
              placeholder="Internal notes for the admin reviewer (not shown publicly)…"
            />
          </div>

          {createStatus === 'error' && (
            <p className="text-sm text-red-600">{createErrorMsg}</p>
          )}

          <button
            type="submit"
            disabled={createStatus === 'submitting' || anyUploading}
            className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            <Send size={16} />
            {createStatus === 'submitting' ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      )}

      {/* ── Import tabs (admin only) ── */}
      {isAdmin && activeTab !== 'create' && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 mb-8">

            {/* Topic tab */}
            {activeTab === 'topic' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic / theme
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Marian apparition sites, Franciscan pilgrimage sites, Irish holy wells…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region / country <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. France, Latin America, Sub-Saharan Africa…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />
                </div>

                {/* Editable prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">AI prompt</label>
                    {promptEdited && (
                      <button
                        type="button"
                        onClick={resetPrompt}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-700 transition-colors"
                      >
                        <RotateCcw size={11} />
                        Reset to default
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={12}
                    value={promptText}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2.5 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-navy-300 leading-relaxed ${
                      promptEdited ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'
                    }`}
                  />
                </div>
              </>
            )}

            {/* URL tab */}
            {activeTab === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URLs <span className="text-gray-400 font-normal">(one per line)</span>
                </label>
                <textarea
                  rows={6}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  placeholder={'https://en.wikipedia.org/wiki/Lourdes\nhttps://www.shrineofourlady.com\nhttps://fatima.pt'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 font-mono"
                />
              </div>
            )}

            {/* Manual tab */}
            {activeTab === 'manual' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paste JSON
                  </label>
                  <textarea
                    rows={10}
                    value={manualJson}
                    onChange={(e) => setManualJson(e.target.value)}
                    placeholder={'[\n  {\n    "name": "...",\n    "short_description": "...",\n    "latitude": 0,\n    "longitude": 0\n  }\n]'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />
                  {manualParseError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      {manualParseError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload file
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 transition-colors">
                    <Upload size={14} />
                    Choose .json file
                    <input
                      type="file"
                      accept=".json"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) loadManualFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <p className="text-xs text-gray-400">
                  You can also drag and drop a .json file anywhere on this page.
                </p>
              </div>
            )}

            {/* Google Maps URL tab */}
            {activeTab === 'gmaps' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paste a Google Maps link
                </label>
                <input
                  type="text"
                  value={gmapsUrl}
                  onChange={(e) => {
                    setGmapsUrl(e.target.value);
                    setGmapsUrlError(null);
                  }}
                  placeholder="https://maps.app.goo.gl/… or https://www.google.com/maps/place/…"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 ${
                    gmapsUrlError ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {gmapsUrlError && (
                  <p className="mt-1 text-xs text-red-600">{gmapsUrlError}</p>
                )}
              </div>
            )}

            {/* Auto-apply tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Auto-apply tags <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <TagMultiSelect
                allTags={localTags}
                selectedIds={autoTagIds}
                onChange={setAutoTagIds}
                onTagCreated={handleTagCreated}
                placeholder="Search or create tags…"
              />
            </div>

            {activeTab === 'manual' && (
              <button
                onClick={handleManualParse}
                disabled={manualParsing || !manualJson.trim()}
                className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {manualParsing ? (
                  <><Loader2 size={16} className="animate-spin" /> Parsing…</>
                ) : (
                  <>Parse JSON</>
                )}
              </button>
            )}

            {discoverError && activeTab !== 'manual' && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle size={14} />
                {discoverError}
              </p>
            )}

            {activeTab !== 'manual' && (
              <button
                onClick={handleDiscover}
                disabled={
                  loading ||
                  (activeTab === 'topic' ? !topic.trim() : activeTab === 'url' ? !urlsText.trim() : !gmapsUrl.trim())
                }
                className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Discovering…</>
                ) : (
                  <><Sparkles size={16} /> Discover sites</>
                )}
              </button>
            )}
          </div>

          {/* ─── Results (inline, below form) ─── */}
          {sites.length > 0 && (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-navy-900">{sites.length} sites found</span>
                  <span className="text-green-700 font-medium">{newSites.length} new</span>
                  {duplicates.length > 0 && (
                    <span className="text-amber-700 font-medium">{duplicates.length} already in inventory</span>
                  )}
                  {publishedIds.size > 0 && (
                    <span className="text-blue-700 font-medium">{publishedIds.size} published</span>
                  )}
                  {enrichingCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-gray-500">
                      <Loader2 size={12} className="animate-spin" />
                      Resolving coordinates… ({enrichedCount}/{enrichingCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Site accordion list */}
              <div className="flex flex-col gap-2">
                {sites.map((site) => {
                  const edit = getEdit(site);
                  const isExpanded = expandedId === site.id;
                  const isPublished = publishedIds.has(site.id);
                  const isDuplicate = site.status === 'duplicate';
                  const isPublishing = publishingId === site.id;
                  const publishError = publishErrors[site.id];

                  return (
                    <div
                      key={site.id}
                      className={`bg-white rounded-xl border transition-colors ${
                        isPublished
                          ? 'border-blue-200'
                          : isDuplicate
                          ? 'border-amber-200'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Row header */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : site.id)}
                      >
                        <span
                          className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            isPublished
                              ? 'bg-blue-100 text-blue-700'
                              : isDuplicate
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {isPublished ? 'Published' : isDuplicate ? 'In inventory' : 'For review'}
                        </span>

                        <span className="flex-1 text-sm font-medium text-navy-900 truncate">
                          {edit.name}
                        </span>

                        <span className="text-xs text-gray-400 shrink-0">
                          {edit.latitude}, {edit.longitude}
                        </span>

                        {isExpanded ? (
                          <ChevronUp size={15} className="text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown size={15} className="text-gray-400 shrink-0" />
                        )}
                      </button>

                      {/* Expanded body */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
                          {isDuplicate && (
                            overriddenIds.has(site.id) ? (
                              <div className="text-sm text-amber-600 bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2">
                                Duplicate override active — ready to publish
                              </div>
                            ) : (
                              <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                                <div>
                                  This site appears to already be in the inventory
                                  {site.duplicate_id && (
                                    <>
                                      {' '}as{' '}
                                      <Link
                                        href={`/site/${site.duplicate_id}`}
                                        className="underline hover:no-underline"
                                        target="_blank"
                                      >
                                        {site.duplicate_id}
                                      </Link>
                                    </>
                                  )}
                                  .
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOverriddenIds((prev) => new Set(prev).add(site.id))}
                                  className="mt-1 text-amber-700 underline hover:no-underline text-sm"
                                >
                                  Publish anyway
                                </button>
                              </div>
                            )
                          )}

                          <SiteForm
                            values={edit}
                            onChange={(field, value) => updateEdit(site.id, field, value)}
                            disabled={isPublished}
                            allTags={localTags}
                            onTagCreated={handleTagCreated}
                            showImageUrl
                            showPhotoUpload
                            onImagesChange={(imgs) => {
                              setSiteImages((prev) => ({ ...prev, [site.id]: imgs }));
                            }}
                            links={getSiteLinks(site.id)}
                            onLinksChange={(links) => setSiteLinks(site.id, links)}
                          />

                          {enrichmentDone && edit.latitude === '0' && edit.longitude === '0' && (
                            <button
                              type="button"
                              onClick={() => handleGoogleGeocode(site)}
                              className="text-xs text-navy-700 hover:text-navy-500 font-medium mt-1 text-left"
                            >
                              📍 Populate coordinates using Google (may incur charges)
                            </button>
                          )}

                          {publishError && (
                            <p className="text-sm text-red-600 flex items-center gap-1.5">
                              <AlertCircle size={14} />
                              {publishError}
                            </p>
                          )}

                          {/* Publish button */}
                          {(!isDuplicate || overriddenIds.has(site.id)) && (
                            <div className="flex justify-end">
                              {isPublished ? (
                                <div className="inline-flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1.5 text-blue-700 text-sm font-medium">
                                    <CheckCircle size={15} />
                                    Published
                                  </span>
                                  {publishedSiteIds[site.id] && (
                                    <Link
                                      href={`/site/${publishedSiteIds[site.id]}`}
                                      target="_blank"
                                      className="text-sm text-navy-700 underline hover:no-underline"
                                    >
                                      View site →
                                    </Link>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePublishOne(site)}
                                  disabled={isPublishing}
                                  className="inline-flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                                >
                                  {isPublishing ? (
                                    <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                                  ) : (
                                    <><CheckCircle size={14} /> Publish site</>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
