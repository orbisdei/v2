'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  Link2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Tag } from '@/lib/types';

interface ImportedSite {
  id: string;
  name: string;
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

interface SiteEdit {
  name: string;
  short_description: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  interest: string;
  image_url: string;
  tag_ids: string[];
}

const INTEREST_OPTIONS = ['global', 'regional', 'local'];

function siteToEdit(site: ImportedSite): SiteEdit {
  return {
    name: site.name,
    short_description: site.short_description,
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    google_maps_url: site.google_maps_url,
    interest: site.interest,
    image_url: '',
    tag_ids: site.tag_ids,
  };
}

export default function ImportClient({ allTags }: { allTags: Tag[] }) {
  // ── Step 1 state ──────────────────────────────────────────
  const [mode, setMode] = useState<'topic' | 'url'>('topic');
  const [topic, setTopic] = useState('');
  const [region, setRegion] = useState('');
  const [urlsText, setUrlsText] = useState('');
  const [autoTagIds, setAutoTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // ── Step 2 state ──────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [sites, setSites] = useState<ImportedSite[]>([]);
  const [edits, setEdits] = useState<Record<string, SiteEdit>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  // ── Helpers ───────────────────────────────────────────────
  function getEdit(site: ImportedSite): SiteEdit {
    return edits[site.id] ?? siteToEdit(site);
  }

  function updateEdit(siteId: string, field: keyof SiteEdit, value: string | string[]) {
    const site = sites.find((s) => s.id === siteId)!;
    setEdits((prev) => ({ ...prev, [siteId]: { ...getEdit(site), [field]: value } }));
  }

  function toggleAutoTag(tagId: string) {
    setAutoTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }

  function toggleSiteTag(siteId: string, tagId: string) {
    const site = sites.find((s) => s.id === siteId)!;
    const current = getEdit(site).tag_ids;
    const next = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    updateEdit(siteId, 'tag_ids', next);
  }

  // ── Discover ──────────────────────────────────────────────
  async function handleDiscover() {
    setLoading(true);
    setDiscoverError(null);
    try {
      const body =
        mode === 'topic'
          ? { mode, topic, region, autoTagIds }
          : {
              mode,
              urls: urlsText
                .split('\n')
                .map((u) => u.trim())
                .filter(Boolean),
              autoTagIds,
            };

      const res = await fetch('/api/import-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'API error');

      setSites(data.sites);
      setEdits({});
      setPublishedIds(new Set());
      setPublishErrors({});
      setExpandedId(null);
      setStep(2);
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

    const { error: siteErr } = await supabase.from('sites').insert({
      id: site.id,
      name: edit.name.trim(),
      short_description: edit.short_description.trim(),
      latitude: Number(edit.latitude),
      longitude: Number(edit.longitude),
      google_maps_url: edit.google_maps_url.trim(),
      interest: edit.interest || null,
      featured: false,
      updated_at: new Date().toISOString(),
    });
    if (siteErr) throw new Error(siteErr.message);

    if (edit.image_url.trim()) {
      await supabase.from('site_images').insert({
        site_id: site.id,
        url: edit.image_url.trim(),
        storage_type: 'external',
        display_order: 0,
      });
    }

    if (site.links.length > 0) {
      await supabase.from('site_links').insert(
        site.links.map((l) => ({
          site_id: site.id,
          url: l.url,
          link_type: l.link_type,
          comment: l.comment ?? null,
        }))
      );
    }

    if (edit.tag_ids.length > 0) {
      await supabase.from('site_tag_assignments').insert(
        edit.tag_ids.map((tag_id) => ({ site_id: site.id, tag_id }))
      );
    }
  }

  async function handlePublishOne(site: ImportedSite) {
    setPublishingId(site.id);
    setPublishErrors((prev) => ({ ...prev, [site.id]: '' }));
    try {
      await publishSite(site);
      setPublishedIds((prev) => new Set(prev).add(site.id));
    } catch (err) {
      setPublishErrors((prev) => ({
        ...prev,
        [site.id]: err instanceof Error ? err.message : 'Error publishing site',
      }));
    } finally {
      setPublishingId(null);
    }
  }

  async function handleBulkPublish() {
    setBulkPublishing(true);
    const toPublish = sites.filter(
      (s) => s.status === 'new' && !publishedIds.has(s.id)
    );
    for (const site of toPublish) {
      try {
        await publishSite(site);
        setPublishedIds((prev) => new Set(prev).add(site.id));
      } catch (err) {
        setPublishErrors((prev) => ({
          ...prev,
          [site.id]: err instanceof Error ? err.message : 'Error',
        }));
      }
    }
    setBulkPublishing(false);
  }

  // ── Stats ─────────────────────────────────────────────────
  const newSites = sites.filter((s) => s.status === 'new');
  const duplicates = sites.filter((s) => s.status === 'duplicate');
  const unpublishedNew = newSites.filter((s) => !publishedIds.has(s.id));

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
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

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5">
          {/* Mode selector */}
          <div className="flex gap-2">
            {(['topic', 'url'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-navy-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m === 'topic' ? 'By topic' : 'By URL'}
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
                placeholder={
                  'https://en.wikipedia.org/wiki/Lourdes\nhttps://www.shrineofourlady.com\nhttps://fatima.pt'
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 font-mono"
              />
            </div>
          )}

          {/* Auto-apply tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto-apply tags <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const selected = autoTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleAutoTag(tag.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selected
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {discoverError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {discoverError}
            </p>
          )}

          <button
            onClick={handleDiscover}
            disabled={loading || (mode === 'topic' ? !topic.trim() : !urlsText.trim())}
            className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Discovering…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Discover sites
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-navy-700 hover:text-navy-500"
              >
                <ArrowLeft size={14} />
                New search
              </button>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-navy-900">{sites.length} sites found</span>
              <span className="text-green-700 font-medium">{newSites.length} new</span>
              {duplicates.length > 0 && (
                <span className="text-amber-700 font-medium">{duplicates.length} already in inventory</span>
              )}
              {publishedIds.size > 0 && (
                <span className="text-blue-700 font-medium">{publishedIds.size} published</span>
              )}
            </div>

            {unpublishedNew.length > 1 && (
              <button
                onClick={handleBulkPublish}
                disabled={bulkPublishing}
                className="inline-flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {bulkPublishing ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                ) : (
                  <><CheckCircle size={14} /> Publish all new ({unpublishedNew.length})</>
                )}
              </button>
            )}
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
                    {/* Status badge */}
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
                        <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
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
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={edit.name}
                            onChange={(e) => updateEdit(site.id, 'name', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Short description</label>
                          <textarea
                            rows={2}
                            value={edit.short_description}
                            onChange={(e) => updateEdit(site.id, 'short_description', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Latitude</label>
                          <input
                            type="text"
                            value={edit.latitude}
                            onChange={(e) => updateEdit(site.id, 'latitude', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Longitude</label>
                          <input
                            type="text"
                            value={edit.longitude}
                            onChange={(e) => updateEdit(site.id, 'longitude', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            <Globe size={11} className="inline mr-1" />
                            Google Maps URL
                          </label>
                          <input
                            type="text"
                            value={edit.google_maps_url}
                            onChange={(e) => updateEdit(site.id, 'google_maps_url', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Interest level</label>
                          <select
                            value={edit.interest}
                            onChange={(e) => updateEdit(site.id, 'interest', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          >
                            {INTEREST_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Photo URL</label>
                          <input
                            type="text"
                            value={edit.image_url}
                            onChange={(e) => updateEdit(site.id, 'image_url', e.target.value)}
                            placeholder="https://…"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
                            disabled={isPublished}
                          />
                        </div>
                      </div>

                      {/* Links */}
                      {site.links.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">
                            <Link2 size={11} className="inline mr-1" />
                            Links
                          </p>
                          <div className="flex flex-col gap-1">
                            {site.links.map((l, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400 w-28 shrink-0">{l.link_type}</span>
                                <a
                                  href={l.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-navy-700 hover:underline truncate"
                                >
                                  {l.url}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allTags.map((tag) => {
                            const selected = edit.tag_ids.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => !isPublished && toggleSiteTag(site.id, tag.id)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  selected
                                    ? 'bg-navy-900 text-white border-navy-900'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-navy-300'
                                } ${isPublished ? 'opacity-50 cursor-default' : ''}`}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {publishError && (
                        <p className="text-sm text-red-600 flex items-center gap-1.5">
                          <AlertCircle size={14} />
                          {publishError}
                        </p>
                      )}

                      {/* Publish button */}
                      {!isDuplicate && (
                        <div className="flex justify-end">
                          {isPublished ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-700 text-sm font-medium">
                              <CheckCircle size={15} />
                              Published
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePublishOne(site)}
                              disabled={isPublishing || bulkPublishing}
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
