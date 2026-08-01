'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import {
  createSiteWithRelations,
  toSiteFormValues,
  payloadToLinkEntries,
  payloadToCelebrationEntries,
  payloadToImageEntries,
  computeSubmissionDelta,
  linksToPayload,
  celebrationsToPayload,
} from '@/lib/createSite';
import { SiteForm, type SiteFormValues, type ImageEntry, buildImagesPayload } from '@/components/admin/SiteForm';
import { generateSiteId } from '@/lib/utils';
import type { Tag, LinkEntry, CelebrationEntry } from '@/lib/types';
import { revalidateSiteEdit, revalidateTagEdit, notifyIndexNow } from '@/app/actions';

export interface Submission {
  id: string;
  type: 'site' | 'tag' | 'note';
  action: 'create' | 'edit';
  payload: Record<string, unknown>;
  site_id: string | null;
  submitted_by: string;
  submitter_name: string;
  created_at: string;
  status: 'pending';
}

type TagWithCount = Tag & { site_count: number };
type EditTargetSites = Record<string, { name: string; has_no_image: boolean }>;

// Site create AND edit submissions carry the same full-snapshot payload
// shape, so they share the same SiteForm-editor state below — only the
// approve action (createSiteWithRelations vs. /api/publish-site-edit)
// actually differs.
function isSiteFormSubmission(s: Submission): boolean {
  return s.type === 'site' && (s.action === 'create' || s.action === 'edit');
}

export default function ResearchClient({
  initialSubmissions,
  initialTags,
  editTargetSites,
}: {
  initialSubmissions: Submission[];
  initialTags: TagWithCount[];
  editTargetSites: EditTargetSites;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [localTags, setLocalTags] = useState<TagWithCount[]>(initialTags);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const [siteFormEdits, setSiteFormEdits] = useState<Record<string, SiteFormValues>>(() =>
    Object.fromEntries(
      initialSubmissions.filter(isSiteFormSubmission).map((s) => [s.id, toSiteFormValues(s.payload)])
    )
  );
  const [siteLinksEdits, setSiteLinksEdits] = useState<Record<string, LinkEntry[]>>(() =>
    Object.fromEntries(
      initialSubmissions.filter(isSiteFormSubmission).map((s) => [s.id, payloadToLinkEntries(s.payload)])
    )
  );
  const [siteCelebrationsEdits, setSiteCelebrationsEdits] = useState<Record<string, CelebrationEntry[]>>(() =>
    Object.fromEntries(
      initialSubmissions.filter(isSiteFormSubmission).map((s) => [s.id, payloadToCelebrationEntries(s.payload)])
    )
  );
  const [siteImagesEdits, setSiteImagesEdits] = useState<Record<string, ImageEntry[]>>({});
  const [siteNoImageEdits, setSiteNoImageEdits] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      initialSubmissions
        .filter((s) => s.type === 'site' && s.action === 'edit' && s.site_id)
        .map((s) => [s.id, editTargetSites[s.site_id as string]?.has_no_image ?? false])
    )
  );
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  async function handleApprove(sub: Submission) {
    const supabase = createClient();
    let indexNowPath: string | null = null;
    let revalidate: (() => Promise<void>) | null = null;

    if (sub.type === 'site' && sub.action === 'create') {
      setPublishingId(sub.id);
      setPublishErrors((prev) => ({ ...prev, [sub.id]: '' }));
      try {
        const edit = siteFormEdits[sub.id] ?? toSiteFormValues(sub.payload);
        const links = siteLinksEdits[sub.id] ?? payloadToLinkEntries(sub.payload);
        const celebrations = siteCelebrationsEdits[sub.id] ?? payloadToCelebrationEntries(sub.payload);
        const images = siteImagesEdits[sub.id] ?? payloadToImageEntries(sub.payload);
        const p = sub.payload;

        const siteId =
          generateSiteId(edit.country, edit.municipality, edit.name) ||
          (p.generated_id as string | null) ||
          crypto.randomUUID();

        const { tagIds } = await createSiteWithRelations(supabase, {
          id: siteId,
          values: edit,
          links,
          celebrations,
          images,
          createdBy: sub.submitted_by,
          hasNoImage: siteNoImageEdits[sub.id] ?? false,
        });

        // Delta capture: what the submission originally proposed vs. what
        // actually got approved, for refining the Discovery prompt over
        // time. Best-effort and non-critical — the site above is already
        // created at this point, so a failure here must never surface as a
        // publish error.
        try {
          const deltas = computeSubmissionDelta(p, edit, links, celebrations, images);
          if (deltas.length > 0) {
            await supabase.from('submission_review_deltas').insert(
              deltas.map((d) => ({
                submission_id: sub.id,
                field: d.field,
                proposed_value: d.proposed,
                submitted_value: d.submitted,
              }))
            );
          }
        } catch {
          // non-fatal — analytics only
        }

        if (p.contributor_note) {
          await supabase.from('site_contributor_notes').insert({
            site_id: siteId,
            note: p.contributor_note as string,
            created_by: sub.submitted_by,
          });
        }
        indexNowPath = `/site/${siteId}`;
        revalidate = () => revalidateSiteEdit(siteId, tagIds);
      } catch (err) {
        setPublishErrors((prev) => ({
          ...prev,
          [sub.id]: err instanceof Error ? err.message : 'Error publishing site',
        }));
        setPublishingId(null);
        return;
      }
      setPublishingId(null);
    } else if (sub.type === 'site' && sub.action === 'edit') {
      setPublishingId(sub.id);
      setPublishErrors((prev) => ({ ...prev, [sub.id]: '' }));
      try {
        const edit = siteFormEdits[sub.id] ?? toSiteFormValues(sub.payload);
        const links = siteLinksEdits[sub.id] ?? payloadToLinkEntries(sub.payload);
        const celebrations = siteCelebrationsEdits[sub.id] ?? payloadToCelebrationEntries(sub.payload);
        const images = siteImagesEdits[sub.id] ?? payloadToImageEntries(sub.payload);
        const p = sub.payload;
        const targetSiteId = (sub.site_id ?? (p.site_id as string | undefined)) as string;
        if (!targetSiteId) throw new Error('Missing target site id on this submission');

        const res = await fetch('/api/publish-site-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: targetSiteId,
            name: edit.name,
            native_name: edit.native_name || null,
            country: edit.country.toUpperCase() || null,
            region: edit.region || null,
            municipality: edit.municipality || null,
            short_description: edit.short_description,
            latitude: edit.latitude,
            longitude: edit.longitude,
            google_maps_url: edit.google_maps_url,
            interest: edit.interest || null,
            type: edit.type || null,
            // Explicit, not omitted — /api/publish-site-edit defaults this to
            // false when the caller doesn't pass it at all, which would
            // silently clear a confirmed no-image flag this edit never
            // touched. Seeded from the target site's current value unless
            // the reviewer explicitly toggled it above.
            has_no_image: siteNoImageEdits[sub.id] ?? editTargetSites[targetSiteId]?.has_no_image ?? false,
            tag_ids: edit.tag_ids,
            images: buildImagesPayload(images),
            links: linksToPayload(links),
            celebrations: celebrationsToPayload(celebrations),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Publish failed');
        }

        // Same delta-capture treatment as a create approval — best-effort,
        // never allowed to surface as a publish error for a site whose edit
        // already succeeded above.
        try {
          const deltas = computeSubmissionDelta(p, edit, links, celebrations, images);
          if (deltas.length > 0) {
            await supabase.from('submission_review_deltas').insert(
              deltas.map((d) => ({
                submission_id: sub.id,
                field: d.field,
                proposed_value: d.proposed,
                submitted_value: d.submitted,
              }))
            );
          }
        } catch {
          // non-fatal — analytics only
        }

        indexNowPath = `/site/${targetSiteId}`;
        revalidate = () => revalidateSiteEdit(targetSiteId, edit.tag_ids);
      } catch (err) {
        setPublishErrors((prev) => ({
          ...prev,
          [sub.id]: err instanceof Error ? err.message : 'Error publishing edit',
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
      if (error) {
        setPublishErrors((prev) => ({ ...prev, [sub.id]: error.message }));
        return;
      }
      indexNowPath = `/tag/${p.id}`;
      revalidate = () => revalidateTagEdit(p.id as string);
    } else if (sub.type === 'tag' && sub.action === 'edit') {
      const p = sub.payload as Record<string, unknown>;
      const tagId = p.tag_id as string;
      const update: Record<string, unknown> = {};
      if (p.name !== undefined) update.name = p.name;
      if (p.description !== undefined) update.description = p.description;
      if (p.image_url !== undefined) update.image_url = p.image_url || null;
      if (p.dedication !== undefined) update.dedication = p.dedication || null;
      const { error } = await supabase.from('tags').update(update).eq('id', tagId);
      if (error) {
        setPublishErrors((prev) => ({ ...prev, [sub.id]: error.message }));
        return;
      }
      indexNowPath = `/tag/${tagId}`;
      revalidate = () => revalidateTagEdit(tagId);
    } else if (sub.type === 'note' && sub.action === 'create') {
      const p = sub.payload;
      const { error } = await supabase.from('site_contributor_notes').insert({
        site_id: p.site_id,
        note: p.note,
        created_by: sub.submitted_by,
      });
      if (error) {
        setPublishErrors((prev) => ({ ...prev, [sub.id]: error.message }));
        return;
      }
      indexNowPath = `/site/${p.site_id}`;
      revalidate = () => revalidateSiteEdit(p.site_id as string, []);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from('pending_submissions')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', sub.id);

    if (revalidate) await revalidate();
    if (indexNowPath) void notifyIndexNow([indexNowPath]);
    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
  }

  async function handleReject(sub: Submission) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from('pending_submissions')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        review_notes: reviewNotes[sub.id] ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', sub.id);
    setSubmissions((s) => s.filter((x) => x.id !== sub.id));
  }

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl text-navy-700 mb-1">Pending approvals</h1>
      <p className="text-sm text-gray-500 mb-4">
        {submissions.length} submission{submissions.length === 1 ? '' : 's'} waiting for review
      </p>

      {submissions.length === 0 && (
        <p className="text-center text-gray-500 py-16">Nothing waiting for review.</p>
      )}

      <div className="space-y-3">
        {submissions.map((sub) => (
          <SubmissionCard
            key={sub.id}
            sub={sub}
            expanded={expandedId === sub.id}
            onToggleExpand={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
            onApprove={() => handleApprove(sub)}
            onReject={() => handleReject(sub)}
            publishing={publishingId === sub.id}
            publishError={publishErrors[sub.id]}
            reviewNote={reviewNotes[sub.id] ?? ''}
            onReviewNoteChange={(v) => setReviewNotes((n) => ({ ...n, [sub.id]: v }))}
            siteFormValues={siteFormEdits[sub.id]}
            onSiteFormChange={(field, value) =>
              setSiteFormEdits((prev) => ({
                ...prev,
                [sub.id]: { ...(prev[sub.id] ?? toSiteFormValues(sub.payload)), [field]: value },
              }))
            }
            localTags={localTags}
            onTagCreated={(tag) => setLocalTags((prev) => [...prev, { ...tag, site_count: 0 }])}
            siteLinks={siteLinksEdits[sub.id] ?? []}
            onSiteLinksChange={(links) => setSiteLinksEdits((prev) => ({ ...prev, [sub.id]: links }))}
            siteCelebrations={siteCelebrationsEdits[sub.id] ?? []}
            onSiteCelebrationsChange={(c) => setSiteCelebrationsEdits((prev) => ({ ...prev, [sub.id]: c }))}
            onSiteImagesChange={(imgs) => setSiteImagesEdits((prev) => ({ ...prev, [sub.id]: imgs }))}
            siteNoImage={
              siteNoImageEdits[sub.id] ?? (sub.site_id ? editTargetSites[sub.site_id]?.has_no_image ?? false : false)
            }
            onSiteNoImageChange={(v) => setSiteNoImageEdits((prev) => ({ ...prev, [sub.id]: v }))}
            editTargetSite={sub.site_id ? editTargetSites[sub.site_id] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function SubmissionCard({
  sub,
  expanded,
  onToggleExpand,
  onApprove,
  onReject,
  publishing,
  publishError,
  reviewNote,
  onReviewNoteChange,
  siteFormValues,
  onSiteFormChange,
  localTags,
  onTagCreated,
  siteLinks,
  onSiteLinksChange,
  siteCelebrations,
  onSiteCelebrationsChange,
  onSiteImagesChange,
  siteNoImage,
  onSiteNoImageChange,
  editTargetSite,
}: {
  sub: Submission;
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  publishing: boolean;
  publishError?: string;
  reviewNote: string;
  onReviewNoteChange: (v: string) => void;
  siteFormValues?: SiteFormValues;
  onSiteFormChange: (field: keyof SiteFormValues, value: string | string[]) => void;
  localTags: TagWithCount[];
  onTagCreated: (tag: Tag) => void;
  siteLinks: LinkEntry[];
  onSiteLinksChange: (links: LinkEntry[]) => void;
  siteCelebrations: CelebrationEntry[];
  onSiteCelebrationsChange: (c: CelebrationEntry[]) => void;
  onSiteImagesChange: (imgs: ImageEntry[], anyUploading: boolean) => void;
  siteNoImage: boolean;
  onSiteNoImageChange: (v: boolean) => void;
  editTargetSite?: { name: string; has_no_image: boolean };
}) {
  const isSiteEdit = sub.type === 'site' && sub.action === 'edit';
  const isSiteForm = sub.type === 'site' && (sub.action === 'create' || isSiteEdit);
  const warnings =
    sub.type === 'site' && sub.action === 'create' && Array.isArray(sub.payload.warnings)
      ? (sub.payload.warnings as string[])
      : [];
  const edit = isSiteForm ? siteFormValues ?? toSiteFormValues(sub.payload) : null;
  const contributorNote =
    typeof sub.payload.contributor_note === 'string' ? sub.payload.contributor_note : undefined;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left min-h-[44px]"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
              {sub.type}
            </span>
            <span className="text-[10px] text-gray-500 uppercase font-medium">{sub.action}</span>
            {warnings.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                <AlertTriangle size={10} /> {warnings.length} warning{warnings.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-navy-900 truncate">
            {isSiteForm
              ? edit?.name || '(untitled)'
              : sub.type === 'note'
              ? 'Contributor note'
              : (sub.payload.name as string) || (sub.payload.tag_id as string) || '(untitled)'}
          </p>
          {isSiteEdit && editTargetSite && (
            <p className="text-[11px] text-navy-600 truncate">Editing: {editTargetSite.name}</p>
          )}
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400">
            <User size={11} />
            {sub.submitter_name} · {new Date(sub.created_at).toLocaleDateString()}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
                <AlertTriangle size={13} /> Needs your attention
              </p>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-[13px] text-amber-900 leading-snug">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contributorNote && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500 font-semibold text-xs uppercase tracking-wide">
                Contributor note:{' '}
              </span>
              <span className="text-gray-700">{contributorNote}</span>
            </div>
          )}

          {isSiteEdit && sub.site_id && (
            <Link
              href={`/site/${sub.site_id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-navy-600 hover:text-navy-400 w-fit"
            >
              <ExternalLink size={11} /> View live site
            </Link>
          )}

          {isSiteForm && edit && (
            <SiteForm
              values={edit}
              onChange={onSiteFormChange}
              allTags={localTags}
              onTagCreated={onTagCreated}
              showPhotoUpload
              links={siteLinks}
              onLinksChange={onSiteLinksChange}
              celebrations={siteCelebrations}
              onCelebrationsChange={onSiteCelebrationsChange}
              onImagesChange={onSiteImagesChange}
              initialImages={payloadToImageEntries(sub.payload)}
              isEditMode={isSiteEdit}
              isAdmin={true}
              hasNoImage={siteNoImage}
              onHasNoImageChange={onSiteNoImageChange}
            />
          )}

          {sub.type === 'note' && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
              <p className="text-gray-500 mb-1">
                Site: <span className="font-medium text-gray-700">{sub.payload.site_id as string}</span>
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">{sub.payload.note as string}</p>
            </div>
          )}

          {sub.type === 'tag' && sub.action === 'edit' && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
              <p className="text-gray-500 mb-1.5">
                Tag: <span className="font-medium text-gray-700">{sub.payload.tag_id as string}</span>
              </p>
              {(['name', 'description', 'image_url', 'dedication'] as const).map((field) => {
                if (sub.payload[field] === undefined) return null;
                const val = sub.payload[field] as string | null;
                return (
                  <div key={field} className="mb-1">
                    <span className="text-gray-400 uppercase tracking-wide">{field.replace('_', ' ')}: </span>
                    <span className="text-gray-700 whitespace-pre-wrap break-words">
                      {val || <em className="text-gray-400">cleared</em>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {sub.type === 'tag' && sub.action === 'create' && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sub.payload, null, 2)}</pre>
            </div>
          )}

          {publishError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} />
              {publishError}
            </p>
          )}

          <textarea
            value={reviewNote}
            onChange={(e) => onReviewNoteChange(e.target.value)}
            rows={2}
            placeholder="Optional rejection reason…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-300"
          />

          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={publishing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 min-h-[44px]"
            >
              {publishing ? (
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
              onClick={onReject}
              disabled={publishing}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 min-h-[44px]"
            >
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
