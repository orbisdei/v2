'use client';

import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  AlertCircle,
  Loader2,
  Settings,
  ClipboardList,
  Users,
  MapPinned,
  Tag as TagIcon,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { syncLocationTags } from '@/lib/locationTags';
import { SiteForm, type SiteFormValues, type LinkEntry, type ImageEntry } from '@/components/admin/SiteForm';
import { generateSiteId } from '@/lib/utils';
import type { Tag, Site } from '@/lib/types';
import SitesPanel from './SitesPanel';

// ---- Types ----

interface Submission {
  id: string;
  type: 'site' | 'tag' | 'note';
  action: 'create' | 'edit';
  payload: Record<string, unknown>;
  submitted_by: string;
  submitter_name: string;
  created_at: string;
  status: 'pending';
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export type AdminSite = Site & { image_count: number };
export type TagWithCount = Tag & { site_count: number };

interface AdminClientProps {
  submissions: Submission[];
  users: UserProfile[];
  allTags: TagWithCount[];
  allSites: AdminSite[];
}

type ActiveSection = 'approvals' | 'users' | 'sites' | 'tags';

const ROLES = ['general', 'contributor', 'administrator'];

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-yellow-100 text-yellow-800',
  contributor: 'bg-blue-100 text-blue-800',
  general: 'bg-gray-100 text-gray-700',
};

// ---- Helpers ----

function payloadToFormValues(p: Record<string, unknown>): SiteFormValues {
  return {
    name: String(p.name ?? ''),
    native_name: String(p.native_name ?? ''),
    country: String(p.country ?? ''),
    region: String(p.region ?? ''),
    municipality: String(p.municipality ?? ''),
    short_description: String(p.short_description ?? ''),
    latitude: String(p.latitude ?? ''),
    longitude: String(p.longitude ?? ''),
    google_maps_url: String(p.google_maps_url ?? ''),
    interest: String(p.interest ?? ''),
    image_url: '',
    tag_ids: Array.isArray(p.tag_ids) ? (p.tag_ids as string[]) : [],
  };
}

function payloadToLinks(p: Record<string, unknown>): LinkEntry[] {
  if (!Array.isArray(p.links)) return [];
  return (p.links as { url: string; link_type: string; comment?: string }[]).map((l) => ({
    id: crypto.randomUUID(),
    link_type: l.link_type,
    url: l.url,
    comment: l.comment ?? '',
  }));
}

function payloadToImageEntries(p: Record<string, unknown>): ImageEntry[] {
  if (!Array.isArray(p.images)) return [];
  return (p.images as { url: string; caption?: string; attribution?: string; storage_type?: string; display_order: number }[]).map((img) => ({
    id: crypto.randomUUID(),
    previewUrl: img.url,
    finalUrl: img.url,
    caption: img.caption ?? '',
    attribution: img.attribution ?? '',
    storage_type: img.storage_type ?? 'local',
    display_order: img.display_order,
    removed: false,
    isNew: false,
    uploading: false,
  }));
}

// ---- Main component ----

export default function AdminClient({
  submissions: initial,
  users: initialUsers,
  allTags: initialTags,
  allSites,
}: AdminClientProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('sites');
  const [submissions, setSubmissions] = useState(initial);
  const [users, setUsers] = useState(initialUsers);
  const [localTags, setLocalTags] = useState<TagWithCount[]>(initialTags);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const navItems: { key: ActiveSection; label: string; icon: ReactNode; badge?: number }[] = [
    {
      key: 'approvals',
      label: 'Pending approvals',
      icon: <ClipboardList size={15} />,
      badge: submissions.length > 0 ? submissions.length : undefined,
    },
    { key: 'users', label: 'Users', icon: <Users size={15} /> },
    { key: 'sites', label: 'Sites', icon: <MapPinned size={15} /> },
    { key: 'tags', label: 'Tags', icon: <TagIcon size={15} /> },
  ];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="font-serif font-bold text-navy-900 text-sm leading-tight">
            Admin dashboard
          </div>
          <div className="text-xs text-gray-400 mt-0.5">orbisdei.org</div>
        </div>

        <nav className="py-2 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex items-center gap-2.5 text-sm text-left transition-colors px-3 py-2 mx-1 rounded-lg ${
                activeSection === item.key
                  ? 'bg-white border border-gray-200 text-navy-900 font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          <div className="mx-1 my-1 border-t border-gray-100" />
          <Link
            href="/admin/settings"
            className="flex items-center gap-2.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors px-3 py-2 mx-1 rounded-lg"
          >
            <Settings size={15} />
            Site settings
          </Link>
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 min-h-0 overflow-auto bg-gray-50 p-6">
        {activeSection === 'approvals' && (
          <ApprovalsPanel
            submissions={submissions}
            setSubmissions={setSubmissions}
            localTags={localTags}
            setLocalTags={setLocalTags}
            showToast={showToast}
          />
        )}
        {activeSection === 'users' && (
          <UsersPanel users={users} setUsers={setUsers} showToast={showToast} />
        )}
        {activeSection === 'sites' && (
          <SitesPanel
            allSites={allSites}
            allTags={localTags}
            onTagCreated={(tag) => setLocalTags((prev) => [...prev, { ...tag, site_count: 0 }])}
            onToast={showToast}
          />
        )}
        {activeSection === 'tags' && (
          <TagsPanel
            tags={localTags}
            setTags={setLocalTags}
            showToast={showToast}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---- Approvals Panel ----

interface ApprovalsPanelProps {
  submissions: Submission[];
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  localTags: TagWithCount[];
  setLocalTags: Dispatch<SetStateAction<TagWithCount[]>>;
  showToast: (msg: string) => void;
}

function ApprovalsPanel({
  submissions,
  setSubmissions,
  localTags,
  setLocalTags,
  showToast,
}: ApprovalsPanelProps) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [siteFormEdits, setSiteFormEdits] = useState<Record<string, SiteFormValues>>(() =>
    Object.fromEntries(
      submissions
        .filter((s) => s.type === 'site' && s.action === 'create')
        .map((s) => [s.id, payloadToFormValues(s.payload)])
    )
  );
  const [siteLinksEdits, setSiteLinksEdits] = useState<Record<string, LinkEntry[]>>(() =>
    Object.fromEntries(
      submissions
        .filter((s) => s.type === 'site' && s.action === 'create')
        .map((s) => [s.id, payloadToLinks(s.payload)])
    )
  );
  const [siteImagesEdits, setSiteImagesEdits] = useState<Record<string, ImageEntry[]>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  async function handleApprove(sub: Submission) {
    const supabase = createClient();

    if (sub.type === 'site' && sub.action === 'create') {
      setPublishingId(sub.id);
      setPublishErrors((prev) => ({ ...prev, [sub.id]: '' }));
      try {
        const edit = siteFormEdits[sub.id] ?? payloadToFormValues(sub.payload);
        const links = siteLinksEdits[sub.id] ?? payloadToLinks(sub.payload);
        const images = siteImagesEdits[sub.id] ?? payloadToImageEntries(sub.payload);
        const p = sub.payload;

        const siteId =
          generateSiteId(edit.country, edit.municipality, edit.name) ||
          (p.generated_id as string | null) ||
          crypto.randomUUID();

        const { error: siteError } = await supabase.from('sites').insert({
          id: siteId,
          name: edit.name.trim(),
          native_name: edit.native_name.trim() || null,
          country: edit.country.toUpperCase().trim() || null,
          region: edit.region.trim() || null,
          municipality: edit.municipality.trim() || null,
          short_description: edit.short_description.trim(),
          latitude: Number(edit.latitude),
          longitude: Number(edit.longitude),
          google_maps_url: edit.google_maps_url.trim(),
          interest: edit.interest || null,
          featured: false,
          created_by: sub.submitted_by,
          updated_at: new Date().toISOString(),
        });
        if (siteError) throw new Error(siteError.message);

        if (edit.tag_ids.length > 0) {
          await supabase.from('site_tag_assignments').insert(
            edit.tag_ids.map((tag_id) => ({ site_id: siteId, tag_id }))
          );
        }

        const validLinks = links.filter((l) => l.url.trim());
        if (validLinks.length > 0) {
          await supabase.from('site_links').insert(
            validLinks.map((l) => ({
              site_id: siteId,
              url: l.url,
              link_type: l.link_type,
              comment: l.comment || null,
            }))
          );
        }

        const validImages = images.filter((img) => !img.removed && img.finalUrl);
        if (validImages.length > 0) {
          await supabase.from('site_images').insert(
            validImages.map((img, i) => ({
              site_id: siteId,
              url: img.finalUrl!,
              caption: img.caption || null,
              attribution: img.attribution || null,
              storage_type: img.storage_type || 'local',
              display_order: i,
            }))
          );
        }

        if (p.contributor_note) {
          await supabase.from('site_contributor_notes').insert({
            site_id: siteId,
            note: p.contributor_note as string,
            created_by: sub.submitted_by,
          });
        }

        await syncLocationTags(
          supabase,
          siteId,
          edit.country ? edit.country.toUpperCase() : null,
          edit.region.trim() || null,
          edit.municipality.trim() || null
        );
      } catch (err) {
        setPublishErrors((prev) => ({
          ...prev,
          [sub.id]: err instanceof Error ? err.message : 'Error publishing site',
        }));
        setPublishingId(null);
        return;
      }
      setPublishingId(null);
    } else if (sub.type === 'tag' && sub.action === 'create') {
      const p = sub.payload as Record<string, unknown>;
      const { error } = await supabase.from('tags').insert({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        image_url: p.image_url ?? null,
        dedication: p.dedication ?? null,
        featured: false,
        created_by: sub.submitted_by,
      });
      if (error) { showToast('Error: ' + error.message); return; }
    } else if (sub.type === 'tag' && sub.action === 'edit') {
      const p = sub.payload as Record<string, unknown>;
      const tagId = p.tag_id as string;
      const update: Record<string, unknown> = {};
      if (p.name !== undefined) update.name = p.name;
      if (p.description !== undefined) update.description = p.description;
      if (p.image_url !== undefined) update.image_url = p.image_url || null;
      if (p.dedication !== undefined) update.dedication = p.dedication || null;
      const { error } = await supabase.from('tags').update(update).eq('id', tagId);
      if (error) { showToast('Error: ' + error.message); return; }
    } else if (sub.type === 'note' && sub.action === 'create') {
      const p = sub.payload;
      const { error } = await supabase.from('site_contributor_notes').insert({
        site_id: p.site_id,
        note: p.note,
        created_by: sub.submitted_by,
      });
      if (error) { showToast('Error: ' + error.message); return; }
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pending_submissions').update({
      status: 'approved',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', sub.id);

    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
    showToast('Approved ✓');
  }

  async function handleReject(sub: Submission) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pending_submissions').update({
      status: 'rejected',
      reviewed_by: user?.id,
      review_notes: reviewNotes[sub.id] ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', sub.id);

    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
    showToast('Rejected');
  }

  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <h2 className="font-serif text-xl font-bold text-navy-900">
        Pending approvals
        {submissions.length > 0 && (
          <span className="ml-2 text-sm font-sans font-normal text-gray-500">
            ({submissions.length})
          </span>
        )}
      </h2>

      {submissions.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No pending submissions.</p>
      )}

      {submissions.map((sub) => {
        const isSiteCreate = sub.type === 'site' && sub.action === 'create';
        const isExpanded = expandedId === sub.id;
        const contributorNote =
          typeof sub.payload.contributor_note === 'string'
            ? sub.payload.contributor_note
            : undefined;

        if (isSiteCreate) {
          const edit = siteFormEdits[sub.id] ?? payloadToFormValues(sub.payload);
          const isPublishing = publishingId === sub.id;
          const publishError = publishErrors[sub.id];

          return (
            <div key={sub.id} className="bg-white rounded-xl border border-gray-200">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : sub.id)}
              >
                <span className="shrink-0 text-xs font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  site
                </span>
                <span className="text-xs text-gray-500 uppercase font-medium shrink-0">create</span>
                <span className="flex-1 text-sm font-medium text-navy-900 truncate">
                  {edit.name || '(untitled)'}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                  <User size={12} />
                  {sub.submitter_name} · {new Date(sub.created_at).toLocaleDateString()}
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-4">
                  {contributorNote && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                      <span className="text-amber-700 font-semibold text-xs uppercase tracking-wide">
                        Contributor note:{' '}
                      </span>
                      <span className="text-gray-700">{contributorNote}</span>
                    </div>
                  )}

                  <SiteForm
                    values={edit}
                    onChange={(field, value) =>
                      setSiteFormEdits((prev) => ({
                        ...prev,
                        [sub.id]: {
                          ...(prev[sub.id] ?? payloadToFormValues(sub.payload)),
                          [field]: value,
                        },
                      }))
                    }
                    allTags={localTags}
                    onTagCreated={(tag) => setLocalTags((prev) => [...prev, { ...tag, site_count: 0 }])}
                    showPhotoUpload
                    links={siteLinksEdits[sub.id] ?? []}
                    onLinksChange={(links) =>
                      setSiteLinksEdits((prev) => ({ ...prev, [sub.id]: links }))
                    }
                    onImagesChange={(imgs) =>
                      setSiteImagesEdits((prev) => ({ ...prev, [sub.id]: imgs }))
                    }
                    initialImages={payloadToImageEntries(sub.payload)}
                  />

                  {publishError && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      {publishError}
                    </p>
                  )}

                  <textarea
                    value={reviewNotes[sub.id] ?? ''}
                    onChange={(e) => setReviewNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
                    rows={2}
                    placeholder="Optional rejection reason…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(sub)}
                      disabled={isPublishing}
                      className="inline-flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60 transition-colors"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Publishing…
                        </>
                      ) : (
                        <>
                          <CheckCircle size={15} /> Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(sub)}
                      disabled={isPublishing}
                      className="inline-flex items-center gap-1.5 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        }

        // Non-site-create submissions
        return (
          <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span
                  className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded mr-2 ${
                    sub.type === 'site'
                      ? 'bg-blue-100 text-blue-800'
                      : sub.type === 'note'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {sub.type}
                </span>
                <span className="text-xs text-gray-500 uppercase font-medium">{sub.action}</span>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <User size={12} />
                  {sub.submitter_name} · {new Date(sub.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {sub.type === 'note' ? (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-700">
                <p className="text-gray-500 mb-1">
                  Site:{' '}
                  <span className="font-medium text-gray-700">
                    {sub.payload.site_id as string}
                  </span>
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {sub.payload.note as string}
                </p>
              </div>
            ) : sub.type === 'tag' && sub.action === 'edit' ? (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-700">
                <p className="text-gray-500 mb-1.5">
                  Tag:{' '}
                  <span className="font-medium text-gray-700">
                    {sub.payload.tag_id as string}
                  </span>
                </p>
                {(['name', 'description', 'image_url', 'dedication'] as const).map((field) => {
                  if (sub.payload[field] === undefined) return null;
                  const val = sub.payload[field] as string | null;
                  return (
                    <div key={field} className="mb-1">
                      <span className="text-gray-400 uppercase tracking-wide">
                        {field.replace('_', ' ')}:{' '}
                      </span>
                      <span className="text-gray-700 whitespace-pre-wrap break-words">
                        {val || <em className="text-gray-400">cleared</em>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(sub.payload, null, 2)}
                </pre>
              </div>
            )}

            <textarea
              value={reviewNotes[sub.id] ?? ''}
              onChange={(e) => setReviewNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
              rows={2}
              placeholder="Optional rejection reason…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(sub)}
                className="inline-flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                <CheckCircle size={15} /> Approve
              </button>
              <button
                onClick={() => handleReject(sub)}
                className="inline-flex items-center gap-1.5 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Tags Panel ----

type TagFilterKey = 'all' | 'no_description' | 'no_photo' | 'no_name' | 'orphaned';

interface TagsPanelProps {
  tags: TagWithCount[];
  setTags: Dispatch<SetStateAction<TagWithCount[]>>;
  showToast: (msg: string) => void;
}

function TagsPanel({ tags, setTags, showToast }: TagsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<TagFilterKey>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const counts = {
    all: tags.length,
    no_description: tags.filter((t) => !t.description?.trim()).length,
    no_photo: tags.filter((t) => !t.image_url?.trim()).length,
    no_name: tags.filter((t) => !t.name?.trim()).length,
    orphaned: tags.filter((t) => t.site_count === 0).length,
  };

  const visibleTags = (() => {
    if (activeFilter === 'no_description') return tags.filter((t) => !t.description?.trim());
    if (activeFilter === 'no_photo') return tags.filter((t) => !t.image_url?.trim());
    if (activeFilter === 'no_name') return tags.filter((t) => !t.name?.trim());
    if (activeFilter === 'orphaned') return tags.filter((t) => t.site_count === 0);
    return tags;
  })();

  const filterPills: { key: TagFilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'no_description', label: 'No description', count: counts.no_description },
    { key: 'no_photo', label: 'No photo', count: counts.no_photo },
    { key: 'no_name', label: 'No name', count: counts.no_name },
    { key: 'orphaned', label: 'Orphaned', count: counts.orphaned },
  ];

  async function handleDeleteTag(tag: TagWithCount) {
    if (!window.confirm(`Delete tag "${tag.name || tag.id}"? This cannot be undone.`)) return;
    setDeletingId(tag.id);

    const isLocationTag = ['country', 'region', 'municipality'].includes(tag.type ?? '');

    if (isLocationTag) {
      // API blocks location tags — delete via Supabase client directly
      const supabase = createClient();
      const { error } = await supabase.from('tags').delete().eq('id', tag.id);
      if (error) {
        showToast('Error: ' + error.message);
        setDeletingId(null);
        return;
      }
    } else {
      const res = await fetch('/api/delete-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tag.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast('Error: ' + (data.error || 'Delete failed'));
        setDeletingId(null);
        return;
      }
    }

    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    setDeletingId(null);
    showToast('Tag deleted');
  }

  async function handleDeleteOrphanedLocationTags() {
    const orphanedLocation = tags.filter(
      (t) => t.site_count === 0 && ['country', 'region', 'municipality'].includes(t.type ?? '')
    );
    if (orphanedLocation.length === 0) {
      showToast('No orphaned location tags found');
      return;
    }
    if (
      !window.confirm(
        `Delete ${orphanedLocation.length} orphaned location tags? This cannot be undone.`
      )
    )
      return;

    setBulkDeleting(true);
    // Delete in reverse hierarchy: municipality → region → country
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

      {/* Bulk action bar — orphaned filter */}
      {activeFilter === 'orphaned' && counts.orphaned > 0 && (
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_7rem_5rem_10rem_8rem] gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide font-medium">
          <div>Tag</div>
          <div>Type</div>
          <div>Sites</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {visibleTags.length === 0 && (
          <p className="text-sm text-gray-500 py-8 text-center">No tags match this filter.</p>
        )}

        {visibleTags.map((tag) => {
          const missingName = !tag.name?.trim();
          const missingDesc = !tag.description?.trim();
          const missingPhoto = !tag.image_url?.trim();
          const allComplete = !missingName && !missingDesc && !missingPhoto;
          const isOrphaned = tag.site_count === 0;
          const isDeleting = deletingId === tag.id;

          return (
            <div
              key={tag.id}
              className="grid grid-cols-[1fr_7rem_5rem_10rem_8rem] gap-2 px-4 py-2.5 items-center border-b border-gray-50 last:border-b-0 hover:bg-gray-50 text-sm"
            >
              {/* Tag name */}
              <div>
                {missingName ? (
                  <span className="italic text-gray-400 text-xs">{tag.id}</span>
                ) : (
                  <span className="font-medium text-navy-900 truncate">{tag.name}</span>
                )}
              </div>

              {/* Type */}
              <div>
                <span className="text-xs text-gray-500 capitalize">{tag.type ?? '—'}</span>
              </div>

              {/* Sites count */}
              <div>
                <span className="text-xs text-gray-600">{tag.site_count}</span>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-1">
                {allComplete ? (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mt-0.5" />
                ) : (
                  <>
                    {missingName && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        name
                      </span>
                    )}
                    {missingDesc && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        description
                      </span>
                    )}
                    {missingPhoto && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        photo
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <a
                  href={`/tag/${tag.id}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  <ExternalLink size={10} /> Edit
                </a>
                {isOrphaned && (
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-1 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50 text-red-700 transition-colors disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Users Panel ----

interface UsersPanelProps {
  users: UserProfile[];
  setUsers: Dispatch<SetStateAction<UserProfile[]>>;
  showToast: (msg: string) => void;
}

function UsersPanel({ users, setUsers, showToast }: UsersPanelProps) {
  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role: newRole } : x)));
    showToast('Role updated');
  }

  return (
    <div className="max-w-3xl">
      <h2 className="font-serif text-xl font-bold text-navy-900 mb-4">Users</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.display_name ?? 'User avatar'}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={14} className="text-gray-500" />
                      </div>
                    )}
                    <span className="font-medium text-navy-900">{u.display_name ?? '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                      ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-block">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="appearance-none border border-gray-200 rounded px-3 py-1 text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-navy-300"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
