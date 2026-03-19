'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Upload } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import type { Site } from '@/lib/types';

interface EditSiteClientProps {
  site: Site;
  userRole: string;
}

type ImageEntry = {
  id: string;
  previewUrl: string;      // Object URL (new) or CDN URL (existing)
  finalUrl: string | null; // CDN URL once uploaded; null while uploading
  caption: string;
  storage_type: string;
  display_order: number;
  removed: boolean;
  isNew: boolean;
  uploading: boolean;
  error?: string;
};

type LinkEntry = {
  id: string;
  link_type: string;
  url: string;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

async function resizeImage(file: File): Promise<Blob> {
  const MAX_DIM = 1600;
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function EditSiteClient({ site, userRole }: EditSiteClientProps) {
  const router = useRouter();
  const isAdmin = userRole === 'administrator';

  const [name, setName] = useState(site.name);
  const [shortDesc, setShortDesc] = useState(site.short_description);
  const [lat, setLat] = useState(String(site.latitude));
  const [lng, setLng] = useState(String(site.longitude));
  const [mapsUrl, setMapsUrl] = useState(site.google_maps_url || '');

  const [links, setLinks] = useState<LinkEntry[]>(() =>
    site.links.map((l) => ({ id: crypto.randomUUID(), link_type: l.link_type, url: l.url }))
  );

  const [images, setImages] = useState<ImageEntry[]>(() =>
    site.images
      .sort((a, b) => a.display_order - b.display_order)
      .map((img, i) => ({
        id: crypto.randomUUID(),
        previewUrl: img.url,
        finalUrl: img.url,
        caption: img.caption || '',
        storage_type: img.storage_type,
        display_order: i,
        removed: false,
        isNew: false,
        uploading: false,
      }))
  );

  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Links helpers ──────────────────────────────────────────
  const addLink = () =>
    setLinks((prev) => [...prev, { id: crypto.randomUUID(), link_type: '', url: '' }]);

  const removeLink = (id: string) =>
    setLinks((prev) => prev.filter((l) => l.id !== id));

  const updateLink = (id: string, field: 'link_type' | 'url', value: string) =>
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  // ── Image upload ───────────────────────────────────────────
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const errors: string[] = [];
      const validFiles: File[] = [];

      Array.from(files).forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: unsupported type (JPEG, PNG, WebP only)`);
        } else if (file.size > MAX_SIZE) {
          errors.push(`${file.name}: exceeds 5MB limit`);
        } else {
          validFiles.push(file);
        }
      });

      setUploadErrors(errors);

      for (const file of validFiles) {
        const tempId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        setImages((prev) => [
          ...prev,
          {
            id: tempId,
            previewUrl,
            finalUrl: null,
            caption: '',
            storage_type: 'local',
            display_order: prev.length,
            removed: false,
            isNew: true,
            uploading: true,
          },
        ]);

        try {
          const resized = await resizeImage(file);
          const formData = new FormData();
          formData.append('file', resized, file.name.replace(/\.[^.]+$/, '.jpg'));
          formData.append('site_id', site.id);

          const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }

          const { url } = await res.json();
          setImages((prev) =>
            prev.map((img) =>
              img.id === tempId ? { ...img, uploading: false, finalUrl: url } : img
            )
          );
        } catch (err) {
          setImages((prev) =>
            prev.map((img) =>
              img.id === tempId
                ? { ...img, uploading: false, error: (err as Error).message }
                : img
            )
          );
        }
      }
    },
    [site.id]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const toggleRemove = (id: string) =>
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, removed: !img.removed } : img))
    );

  // ── Submit ─────────────────────────────────────────────────
  const buildImagesPayload = () =>
    images
      .filter((img) => !img.removed && (img.finalUrl || !img.isNew))
      .map((img, i) => ({
        url: img.finalUrl ?? img.previewUrl,
        caption: img.caption,
        storage_type: img.storage_type,
        display_order: i,
      }));

  const buildLinksPayload = () =>
    links
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url, link_type: l.link_type }));

  const anyUploading = images.some((img) => img.uploading);

  const handleSubmit = async () => {
    if (anyUploading) return;
    setSubmitting(true);

    const imagesPayload = buildImagesPayload();
    const linksPayload = buildLinksPayload();

    try {
      if (isAdmin) {
        // Admin: publish directly
        const res = await fetch('/api/publish-site-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: site.id,
            name,
            short_description: shortDesc,
            latitude: lat,
            longitude: lng,
            google_maps_url: mapsUrl,
            images: imagesPayload,
            links: linksPayload,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Publish failed');
        }
        setToast({ msg: 'Changes published.', type: 'success' });
        setTimeout(() => router.push(`/site/${site.id}`), 1500);
      } else {
        // Contributor: create pending edit
        const { error } = await supabase.from('site_edits').insert({
          site_id: site.id,
          status: 'pending',
          name,
          short_description: shortDesc,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          google_maps_url: mapsUrl,
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

  // ── Shared input style ─────────────────────────────────────
  const inputCls =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[16px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white';
  const labelCls = 'block text-[13px] font-medium text-gray-500 mb-1.5';

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

        {/* ── Name ── */}
        <div className="mb-6">
          <label className={labelCls}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* ── Short description ── */}
        <div className="mb-6">
          <label className={labelCls}>Short description</label>
          <div className="relative">
            <textarea
              value={shortDesc}
              onChange={(e) => {
                if (e.target.value.length <= 500) setShortDesc(e.target.value);
              }}
              rows={3}
              className={`${inputCls} resize-y min-h-[80px]`}
            />
            <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
              {shortDesc.length} / 500
            </span>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="mb-6">
          <label className={labelCls}>Location</label>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="number"
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className={`${inputCls} md:w-1/2`}
              step="any"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className={`${inputCls} md:w-1/2`}
              step="any"
            />
          </div>
        </div>

        {/* ── Google Maps URL ── */}
        <div className="mb-6">
          <label className={labelCls}>Google Maps URL</label>
          <input
            type="url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* ── Links ── */}
        <div className="mb-6">
          <label className={labelCls}>Links</label>
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <div key={link.id} className="flex flex-col md:flex-row gap-2 items-start">
                <input
                  type="text"
                  placeholder="Link type"
                  value={link.link_type}
                  onChange={(e) => updateLink(link.id, 'link_type', e.target.value)}
                  className={`${inputCls} md:w-[40%]`}
                />
                <input
                  type="url"
                  placeholder="URL"
                  value={link.url}
                  onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                  className={`${inputCls} md:flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  className="mt-1 md:mt-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Remove link"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLink}
            className="mt-2 inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
          >
            <Plus size={14} />
            Add link
          </button>
        </div>

        {/* ── Photos ── */}
        <div className="mb-6">
          <label className={labelCls}>Photos</label>

          {/* Thumbnail row */}
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                >
                  <img
                    src={img.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />

                  {/* Uploading overlay */}
                  {img.uploading && (
                    <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-end">
                      <div className="w-full h-1 bg-gray-200">
                        <div
                          className="h-1 bg-navy-700 animate-pulse"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error overlay */}
                  {img.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-[9px] text-red-700 font-medium px-1 text-center">
                        Error
                      </span>
                    </div>
                  )}

                  {/* Removed overlay */}
                  {img.removed && (
                    <div className="absolute inset-0 bg-red-500/40" />
                  )}

                  {/* Remove / restore button */}
                  {!img.uploading && (
                    <button
                      type="button"
                      onClick={() => toggleRemove(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                      aria-label={img.removed ? 'Restore photo' : 'Remove photo'}
                    >
                      <X size={10} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload errors */}
          {uploadErrors.length > 0 && (
            <div className="mb-2 space-y-1">
              {uploadErrors.map((err, i) => (
                <p key={i} className="text-[12px] text-[#a32d2d]">{err}</p>
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-[1.5px] border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-navy-400 bg-navy-50' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-[12px] md:text-[13px] text-gray-500">
              Drag photos here or click to browse
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              JPEG, PNG, or WebP — max 5MB each
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

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
            disabled={submitting || anyUploading}
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
