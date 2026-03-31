'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { syncLocationTags } from '@/lib/locationTags';
import { SiteForm, SiteFormValues, LinkEntry, ImageEntry } from '@/components/admin/SiteForm';
import { generateSiteId } from '@/lib/utils';
import type { Tag } from '@/lib/types';

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

interface AdminClientProps {
  submissions: Submission[];
  users: UserProfile[];
  allTags: Tag[];
}

const ROLES = ['general', 'contributor', 'administrator'];

const ROLE_COLORS: Record<string, string> = {
  administrator: 'bg-gold-100 text-gold-800',
  contributor: 'bg-blue-100 text-blue-800',
  general: 'bg-gray-100 text-gray-700',
};

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

export default function AdminClient({ submissions: initial, users: initialUsers, allTags: initialTags }: AdminClientProps) {
  const [submissions, setSubmissions] = useState(initial);
  const [users, setUsers] = useState(initialUsers);
  const [localTags, setLocalTags] = useState<Tag[]>(initialTags);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'submissions' | 'users'>('submissions');
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-submission inline edit state for site+create
  const [siteFormEdits, setSiteFormEdits] = useState<Record<string, SiteFormValues>>(() =>
    Object.fromEntries(
      initial
        .filter((s) => s.type === 'site' && s.action === 'create')
        .map((s) => [s.id, payloadToFormValues(s.payload)])
    )
  );
  const [siteLinksEdits, setSiteLinksEdits] = useState<Record<string, LinkEntry[]>>(() =>
    Object.fromEntries(
      initial
        .filter((s) => s.type === 'site' && s.action === 'create')
        .map((s) => [s.id, payloadToLinks(s.payload)])
    )
  );
  const [siteImagesEdits, setSiteImagesEdits] = useState<Record<string, ImageEntry[]>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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

    // Mark submission as approved
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

  async function handleRoleChange(userId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    setUsers((u) => u.map((x) => x.id === userId ? { ...x, role: newRole } : x));
    showToast('Role updated');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-navy-900">Admin Dashboard</h1>
        <Link
          href="/admin/import"
          className="inline-flex items-center gap-1.5 bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
        >
          <Sparkles size={14} />
          Import sites with AI
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['submissions', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-navy-900 text-navy-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'submissions' ? `Pending (${submissions.length})` : 'Users'}
          </button>
        ))}
      </div>

      {/* Pending submissions */}
      {activeTab === 'submissions' && (
        <div className="flex flex-col gap-4">
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
                  {/* Accordion header */}
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
                    {isExpanded
                      ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
                      : <ChevronDown size={15} className="text-gray-400 shrink-0" />
                    }
                  </button>

                  {/* Expanded form */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-4">
                      {/* Contributor note */}
                      {contributorNote && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                          <span className="text-amber-700 font-semibold text-xs uppercase tracking-wide">Contributor note: </span>
                          <span className="text-gray-700">{contributorNote}</span>
                        </div>
                      )}

                      <SiteForm
                        values={edit}
                        onChange={(field, value) =>
                          setSiteFormEdits((prev) => ({
                            ...prev,
                            [sub.id]: { ...(prev[sub.id] ?? payloadToFormValues(sub.payload)), [field]: value },
                          }))
                        }
                        allTags={localTags}
                        onTagCreated={(tag) => setLocalTags((prev) => [...prev, tag])}
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
                          {isPublishing
                            ? <><Loader2 size={15} className="animate-spin" /> Publishing…</>
                            : <><CheckCircle size={15} /> Approve</>
                          }
                        </button>
                        <button
                          onClick={() => handleReject(sub)}
                          disabled={isPublishing}
                          className="inline-flex items-center gap-1.5 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
                        >
                          <XCircle size={15} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Non-site-create submissions: compact card
            return (
              <div key={sub.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <span className={`inline-block text-xs font-semibold uppercase px-2 py-0.5 rounded mr-2 ${
                      sub.type === 'site' ? 'bg-blue-100 text-blue-800' : sub.type === 'note' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {sub.type}
                    </span>
                    <span className="text-xs text-gray-500 uppercase font-medium">{sub.action}</span>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <User size={12} />
                      {sub.submitter_name} · {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Payload preview */}
                {sub.type === 'note' ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-700">
                    <p className="text-gray-500 mb-1">Site: <span className="font-medium text-gray-700">{sub.payload.site_id as string}</span></p>
                    <p className="whitespace-pre-wrap leading-relaxed">{sub.payload.note as string}</p>
                  </div>
                ) : sub.type === 'tag' && sub.action === 'edit' ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-700">
                    <p className="text-gray-500 mb-1.5">Tag: <span className="font-medium text-gray-700">{sub.payload.tag_id as string}</span></p>
                    {(['name', 'description', 'image_url', 'dedication'] as const).map((field) => {
                      if (sub.payload[field] === undefined) return null;
                      const val = sub.payload[field] as string | null;
                      return (
                        <div key={field} className="mb-1">
                          <span className="text-gray-400 uppercase tracking-wide">{field.replace('_', ' ')}: </span>
                          <span className="text-gray-700 whitespace-pre-wrap break-words">{val || <em className="text-gray-400">cleared</em>}</span>
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

                {/* Review notes */}
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
                    <CheckCircle size={15} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(sub)}
                    className="inline-flex items-center gap-1.5 bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
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
                        <img src={u.avatar_url} alt={u.display_name ?? 'User avatar'} className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={14} className="text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium text-navy-900">{u.display_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
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
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
