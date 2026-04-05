'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Tag, LinkEntry } from '@/lib/types';
import ImageUploader from '@/components/admin/ImageUploader';
import type { ImageEntry } from '@/components/admin/SiteForm';

interface EditTagClientProps {
  tag: Tag;
  userRole: string;
  userId: string;
  creatorName: string | null;
  hasPendingEdit: boolean;
  initialLinks: LinkEntry[];
}

const LOCATION_TYPES = ['country', 'region', 'municipality'];
const MAX_DEDICATION = 280;

export default function EditTagClient({
  tag,
  userRole,
  userId,
  creatorName,
  hasPendingEdit,
  initialLinks,
}: EditTagClientProps) {
  const router = useRouter();
  const isAdmin = userRole === 'administrator';
  const isLocation = LOCATION_TYPES.includes(tag.type ?? '');
  const canEditDedication = isAdmin || (!isLocation && userId === tag.created_by);

  const [name, setName] = useState(tag.name);
  const [description, setDescription] = useState(tag.description ?? '');
  const [imageUrl, setImageUrl] = useState(tag.image_url ?? '');
  const [imageAttribution, setImageAttribution] = useState(tag.image_attribution ?? '');
  const [featured, setFeatured] = useState(tag.featured ?? false);
  const [dedication, setDedication] = useState(tag.dedication ?? '');
  const [links, setLinks] = useState<LinkEntry[]>(initialLinks);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleAutoGenerate() {
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/generate-tag-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: name, tag_type: tag.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setDescription((prev) => prev ? `${prev}\n${data.description}` : data.description);
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGeneratingDesc(false);
    }
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isAdmin) {
        // Admin: direct update
        const payload: Record<string, unknown> = { tag_id: tag.id, name, description };
        if (!isLocation) {
          payload.image_url = imageUrl || null;
          payload.image_attribution = imageAttribution || null;
        }
        payload.featured = featured;
        if (canEditDedication) payload.dedication = dedication || null;
        payload.links = links;

        const res = await fetch('/api/update-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Update failed');
        showToastMsg('Saved ✓');
        setTimeout(() => router.push(`/tag/${tag.id}`), 1000);
      } else {
        // Contributor: submit for review
        const supabase = createClient();
        const payload: Record<string, unknown> = {
          tag_id: tag.id,
          name,
          description,
        };
        if (!isLocation) {
          payload.image_url = imageUrl || null;
          payload.image_attribution = imageAttribution || null;
        }
        if (canEditDedication) payload.dedication = dedication || null;
        payload.links = links;

        const { error } = await supabase.from('pending_submissions').insert({
          type: 'tag',
          action: 'edit',
          payload,
          submitted_by: userId,
        });
        if (error) throw new Error(error.message);
        showToastMsg('Submitted for review');
        setTimeout(() => router.push(`/tag/${tag.id}`), 1200);
      }
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/delete-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tag.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      router.push('/');
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300';

  const initialImages: ImageEntry[] | undefined = tag.image_url
    ? [
        {
          id: 'existing-tag-image',
          previewUrl: tag.image_url,
          finalUrl: tag.image_url,
          caption: '',
          attribution: tag.image_attribution ?? '',
          storage_type: 'external',
          display_order: 0,
          removed: false,
          isNew: false,
          uploading: false,
        },
      ]
    : undefined;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/tag/${tag.id}`}
          className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium"
        >
          <ArrowLeft size={16} />
          Back to tag
        </Link>
      </div>

      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-1">Edit tag</h1>
      <p className="text-sm text-gray-500 mb-6">{tag.name}</p>

      {/* Pending edit banner */}
      {hasPendingEdit && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium">
            You have a pending edit for this tag that is awaiting review.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white rounded-xl border border-gray-200 p-6">

        {/* Name */}
        <div>
          <label className={labelClass}>Name <span className="text-red-500">*</span></label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={300}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={generatingDesc}
              className="inline-flex items-center gap-1 text-sm text-navy-700 hover:text-navy-500 font-medium disabled:opacity-50"
            >
              <Sparkles size={14} />
              {generatingDesc ? 'Generating…' : 'Auto-Generate'}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={5000}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Links */}
        <div>
          <label className={labelClass}>Links</label>
          {links.map((link, idx) => (
            <div key={link.id ?? idx} className="flex flex-col gap-2 mb-3 p-3 border border-gray-200 rounded-lg">
              <input
                type="url"
                placeholder="URL"
                value={link.url}
                onChange={(e) => setLinks(links.map((l, i) => i === idx ? { ...l, url: e.target.value } : l))}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Label (e.g. Official Website)"
                value={link.link_type}
                onChange={(e) => setLinks(links.map((l, i) => i === idx ? { ...l, link_type: e.target.value } : l))}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={link.comment ?? ''}
                onChange={(e) => setLinks(links.map((l, i) => i === idx ? { ...l, comment: e.target.value } : l))}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                className="self-end text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setLinks([...links, { url: '', link_type: '', comment: '' }])}
            className="text-sm text-navy-700 font-medium hover:text-navy-500"
          >
            + Add link
          </button>
        </div>

        {/* Image — topic tags only */}
        {!isLocation && (
          <div>
            <label className={labelClass}>Image</label>
            <ImageUploader
              mode="tag"
              entityId={tag.id}
              onImagesChange={(imgs, anyUploading) => {
                setUploading(anyUploading);
                const activeImg = imgs.find((i) => !i.removed);
                setImageUrl(activeImg?.finalUrl ?? activeImg?.previewUrl ?? '');
                setImageAttribution(activeImg?.attribution ?? '');
              }}
              initialImages={initialImages}
              searchName={tag.name}
            />
          </div>
        )}

        {/* Featured — admin only */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-navy-700 focus:ring-navy-300"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">
              Featured tag
            </label>
          </div>
        )}

        {/* Dedication — topic tags, creator or admin only */}
        {canEditDedication && (
          <div>
            <label className={labelClass}>Dedication</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-navy-300">
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-300 whitespace-nowrap shrink-0 select-none">
                This research was dedicated to
              </span>
              <input
                type="text"
                value={dedication}
                onChange={(e) => setDedication(e.target.value.slice(0, MAX_DEDICATION))}
                maxLength={MAX_DEDICATION}
                placeholder="…"
                className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {dedication.length}/{MAX_DEDICATION}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          {submitting
            ? (isAdmin ? 'Saving…' : 'Submitting…')
            : (isAdmin ? 'Save changes' : 'Submit for review')}
        </button>
      </form>

      {/* Delete — admin + topic tags only */}
      {isAdmin && !isLocation && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete this tag
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-3">
                This will remove the tag &ldquo;{tag.name}&rdquo; from all associated sites. This cannot be undone. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
