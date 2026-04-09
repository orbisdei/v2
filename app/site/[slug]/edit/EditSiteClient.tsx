'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Site, Tag } from '@/lib/types';
import { generateSiteId } from '@/lib/utils';
import {
  SiteForm,
  SiteFormValues,
  ImageEntry,
  buildImagesPayload,
} from '@/components/admin/SiteForm';
import type { LinkEntry } from '@/lib/types';

interface EditSiteClientProps {
  site: Site;
  userRole: string;
}

export default function EditSiteClient({ site, userRole }: EditSiteClientProps) {
  const router = useRouter();
  const isAdmin = userRole === 'administrator';

  const [values, setValues] = useState<SiteFormValues>({
    name: site.name,
    native_name: site.native_name ?? '',
    country: site.country ?? '',
    region: site.region ?? '',
    municipality: site.municipality ?? '',
    short_description: site.short_description,
    latitude: String(site.latitude),
    longitude: String(site.longitude),
    google_maps_url: site.google_maps_url ?? '',
    interest: site.interest ?? '',
    image_url: '',
    tag_ids: site.tag_ids ?? [],
  });

  function handleChange(field: keyof SiteFormValues, value: string | string[]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  // Links — parent-controlled, includes comment
  const [links, setLinks] = useState<LinkEntry[]>(() =>
    site.links.map((l) => ({
      id: crypto.randomUUID(),
      link_type: l.link_type,
      url: l.url,
      comment: l.comment ?? '',
    }))
  );

  // Images — managed by SiteForm; parent reads via ref on submit
  const [initialImages] = useState<ImageEntry[]>(() =>
    site.images
      .sort((a, b) => a.display_order - b.display_order)
      .map((img, i) => ({
        id: crypto.randomUUID(),
        previewUrl: img.url,
        finalUrl: img.url,
        caption: img.caption || '',
        attribution: img.attribution || '',
        storage_type: img.storage_type,
        display_order: i,
        removed: false,
        isNew: false,
        uploading: false,
      }))
  );
  const latestImages = useRef<ImageEntry[]>(initialImages);
  const [anyUploading, setAnyUploading] = useState(false);

  function handleImagesChange(imgs: ImageEntry[], uploading: boolean) {
    latestImages.current = imgs;
    setAnyUploading(uploading);
  }

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  useEffect(() => {
    createClient()
      .from('tags')
      .select('*')
      .order('name')
      .then(({ data }) => { if (data) setAllTags(data); });
  }, []);

  function handleTagCreated(tag: Tag) {
    setAllTags((prev) => [...prev, tag]);
  }

  const [hasNoImage, setHasNoImage] = useState(site.has_no_image ?? false);
  const [featured, setFeatured] = useState(site.featured ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [renameConfirmed, setRenameConfirmed] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Compute new ID and detect rename
  const generatedId = generateSiteId(values.country, values.municipality, values.name);
  const idWillChange = isAdmin && !!generatedId && generatedId !== site.id;

  // ── Submit ──────────────────────────────────────────────────
  const buildLinksPayload = () =>
    links
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url, link_type: l.link_type, comment: l.comment || null }));

  const handleSubmit = async () => {
    if (anyUploading) return;
    if (isAdmin && idWillChange && !renameConfirmed) return;

    setSubmitting(true);

    const imagesPayload = buildImagesPayload(latestImages.current);
    const linksPayload = buildLinksPayload();

    try {
      if (isAdmin) {
        const res = await fetch('/api/publish-site-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: site.id,
            new_id: idWillChange ? generatedId : undefined,
            name: values.name,
            native_name: values.native_name || null,
            country: values.country.toUpperCase() || null,
            region: values.region || null,
            municipality: values.municipality || null,
            short_description: values.short_description,
            latitude: values.latitude,
            longitude: values.longitude,
            google_maps_url: values.google_maps_url,
            interest: values.interest || null,
            featured,
            has_no_image: hasNoImage,
            tag_ids: values.tag_ids,
            images: imagesPayload,
            links: linksPayload,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Publish failed');
        }
        setToast({ msg: 'Changes published.', type: 'success' });
        const redirectId = idWillChange ? generatedId : site.id;
        setTimeout(() => router.push(`/site/${redirectId}`), 1500);
      } else {
        // Contributor: create pending edit
        const supabase = createClient();
        const { error } = await supabase.from('site_edits').insert({
          site_id: site.id,
          status: 'pending',
          name: values.name,
          native_name: values.native_name || null,
          country: values.country.toUpperCase() || null,
          region: values.region || null,
          municipality: values.municipality || null,
          short_description: values.short_description,
          latitude: parseFloat(values.latitude),
          longitude: parseFloat(values.longitude),
          google_maps_url: values.google_maps_url,
          interest: values.interest || null,
          tag_ids: values.tag_ids,
          images: imagesPayload,
          links: linksPayload,
        });
        if (error) throw new Error(error.message);
        setToast({ msg: 'Your edits have been submitted for review.', type: 'success' });
        setTimeout(() => router.push(`/site/${site.id}`), 2000);
      }
    } catch (err) {
      setToast({ msg: (err as Error).message, type: 'error' });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-[13px] font-medium shadow-md ${
            toast.type === 'success'
              ? 'bg-[#eaf3de] text-[#3b6d11]'
              : 'bg-[#fcebeb] text-[#a32d2d]'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-[700px] mx-auto px-4 md:px-6 pt-6">
        {/* Back link */}
        <Link
          href={`/site/${site.id}`}
          className="inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500 mb-5"
        >
          <ArrowLeft size={14} />
          Back to {site.name}
        </Link>

        {/* Heading */}
        <h1 className="font-serif text-[22px] font-medium text-navy-900 mb-1">Edit site</h1>
        {!isAdmin && (
          <p className="text-[13px] text-gray-400 mb-6">
            Your changes will be reviewed by an administrator before publishing.
          </p>
        )}
        {isAdmin && <div className="mb-6" />}

        {/* Unified SiteForm — core fields + links + photos */}
        <div className="mb-6">
          <SiteForm
            values={values}
            onChange={handleChange}
            allTags={allTags}
            onTagCreated={handleTagCreated}
            links={links}
            onLinksChange={setLinks}
            showPhotoUpload
            siteId={site.id}
            initialImages={initialImages}
            onImagesChange={handleImagesChange}
            isEditMode
            isAdmin={isAdmin}
            hasNoImage={hasNoImage}
            onHasNoImageChange={setHasNoImage}
          />
        </div>

        {/* ── ID rename warning (admin only) ── */}
        {isAdmin && idWillChange && !renameConfirmed && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-amber-800 font-medium">
                Saving will rename this page&apos;s URL
              </p>
              <p className="text-[12px] text-amber-700 mt-0.5 font-mono break-all">
                {site.id} → {generatedId}
              </p>
              <button
                type="button"
                onClick={() => setRenameConfirmed(true)}
                className="mt-2 text-[12px] font-medium text-amber-800 underline hover:no-underline"
              >
                I understand — proceed with rename
              </button>
            </div>
          </div>
        )}

        {/* ── Featured toggle (admin only) ── */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-6">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-navy-700 focus:ring-navy-300"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700">
              Featured site
            </label>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2.5 mt-6">
          <Link
            href={`/site/${site.id}`}
            className="w-full md:w-auto text-center border border-gray-300 text-gray-600 rounded-lg px-5 py-2.5 text-[14px] hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || anyUploading || (isAdmin && idWillChange && !renameConfirmed)}
            className="w-full md:w-auto bg-navy-900 text-white rounded-lg px-6 py-2.5 text-[14px] font-medium hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Saving…'
              : isAdmin
              ? 'Publish changes'
              : 'Submit for review'}
          </button>
        </div>
      </div>
    </div>
  );
}
