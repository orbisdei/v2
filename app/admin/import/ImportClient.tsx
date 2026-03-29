'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
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
import { SiteForm, SiteFormValues, LinkEntry, ImageEntry } from '@/components/admin/SiteForm';
import TagMultiSelect from '@/components/admin/TagMultiSelect';
import type { Tag } from '@/lib/types';

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

interface ImportedSite {
  id: string;          // temporary UI key (slugified name)
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

function buildDefaultPrompt(topic: string, region: string): string {
  return `List real, verifiable Catholic holy sites related to: "${topic}"${region ? ` in or near ${region}` : ''}.

Restrict yourself to sites which have direct connections to the topic. For example, if the topic is a saint, do not include shrines in honor of the saint. Only include places where the saint lived or is now buried.

Return a JSON array where each element has exactly these fields:
[
  {
    "name": "Full official name of the site",
    "short_description": "1–2 sentences describing its Catholic significance",
    "latitude": 12.3456,
    "longitude": 78.9012,
    "google_maps_url": "https://maps.app.goo.gl/...",
    "interest": "global",
    "links": [
      {"url": "https://...", "link_type": "Official Website"},
      {"url": "https://en.wikipedia.org/wiki/...", "link_type": "Wikipedia"}
    ]
  }
]

Check the google maps link for accuracy.
interest must be one of: "global", "regional", "local", "personal".
Only include sites you are highly confident about. Provide accurate GPS coordinates.`;
}

export default function ImportClient({ allTags: initialTags }: { allTags: Tag[] }) {
  const [localTags, setLocalTags] = useState<Tag[]>(initialTags);

  function handleTagCreated(tag: Tag) {
    setLocalTags((prev) => [...prev, tag]);
  }

  // ── Form state ────────────────────────────────────────────
  const [mode, setMode] = useState<'topic' | 'url' | 'manual' | 'gmaps'>('topic');
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
          (e) => Math.abs((e.latitude as number) - lat) < 0.01 || Math.abs((e.longitude as number) - lon) < 0.01
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
    if (mode !== 'manual') return;

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
  }, [mode]);

  // ── Loading / error ───────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // ── Results state ─────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────
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

  // ── Discover ──────────────────────────────────────────────
  async function handleDiscover() {
    if (mode === 'gmaps') {
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
      if (mode === 'topic') {
        body = { mode, topic, region, autoTagIds, promptOverride: promptText };
      } else if (mode === 'url') {
        body = { mode, urls: urlsText.split('\n').map((u) => u.trim()).filter(Boolean), autoTagIds };
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
      if (mode === 'gmaps' && data.sites.length === 1) {
        setExpandedId(data.sites[0].id);
      } else {
        setExpandedId(null);
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
      updated_at: new Date().toISOString(),
    });
    if (siteErr) throw new Error(siteErr.message);

    const uploadedImages = (siteImages[site.id] ?? [])
      .filter((img) => !img.removed && img.finalUrl)
      .map((img, i) => ({
        site_id: finalId,
        url: img.finalUrl!,
        caption: img.caption || null,
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

  // ── Stats ─────────────────────────────────────────────────
  const newSites = sites.filter((s) => s.status === 'new');
  const duplicates = sites.filter((s) => s.status === 'duplicate');

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Drag-and-drop overlay (manual mode only) */}
      {mode === 'manual' && isDragging && (
        <div className="fixed inset-0 z-50 bg-navy-900/20 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl border-2 border-dashed border-navy-400 px-16 py-12 text-center shadow-xl">
            <Upload size={32} className="mx-auto mb-3 text-navy-400" />
            <p className="text-navy-900 font-medium">Drop your .json file here</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500"
        >
          <ArrowLeft size={15} />
          Admin
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="font-serif text-2xl font-bold text-navy-900">Import Sites with AI</h1>
      </div>

      {/* ─── FORM (always visible) ─── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 mb-8">
        {/* Mode selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['topic', 'url', 'manual', 'gmaps'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-navy-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m === 'topic' ? 'By topic' : m === 'url' ? 'By URL' : m === 'manual' ? 'Manual' : 'Google Maps URL'}
            </button>
          ))}
        </div>

        {/* Topic mode */}
        {mode === 'topic' && (
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

        {/* URL mode */}
        {mode === 'url' && (
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

        {/* Manual mode */}
        {mode === 'manual' && (
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

        {/* Google Maps URL mode */}
        {mode === 'gmaps' && (
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

        {mode === 'manual' && (
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

        {discoverError && mode !== 'manual' && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle size={14} />
            {discoverError}
          </p>
        )}

        {mode !== 'manual' && (
          <button
            onClick={handleDiscover}
            disabled={
              loading ||
              (mode === 'topic' ? !topic.trim() : mode === 'url' ? !urlsText.trim() : !gmapsUrl.trim())
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

      {/* ─── RESULTS (inline, below form) ─── */}
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
    </div>
  );
}
