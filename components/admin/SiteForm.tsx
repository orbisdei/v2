'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { generateSiteId } from '@/lib/utils';
import TagMultiSelect from './TagMultiSelect';
import type { Tag } from '@/lib/types';
import { Upload, Plus, X, Loader2 } from 'lucide-react';

export interface SiteFormValues {
  name: string;
  native_name: string;
  country: string;
  region: string;
  municipality: string;
  short_description: string;
  latitude: string;
  longitude: string;
  google_maps_url: string;
  interest: string;
  image_url: string;
  tag_ids: string[];
}

export const EMPTY_SITE_FORM: SiteFormValues = {
  name: '',
  native_name: '',
  country: '',
  region: '',
  municipality: '',
  short_description: '',
  latitude: '',
  longitude: '',
  google_maps_url: '',
  interest: '',
  image_url: '',
  tag_ids: [],
};


export type LinkEntry = {
  id: string;
  link_type: string;
  url: string;
  comment: string;
};

export type ImageEntry = {
  id: string;
  previewUrl: string;
  finalUrl: string | null;
  caption: string;
  storage_type: string;
  display_order: number;
  removed: boolean;
  isNew: boolean;
  uploading: boolean;
  error?: string;
};

/** Build the images payload for submission — call this with the latest images from onImagesChange. */
export function buildImagesPayload(images: ImageEntry[]) {
  return images
    .filter((img) => !img.removed && (img.finalUrl || !img.isNew))
    .map((img, i) => ({
      url: img.finalUrl ?? img.previewUrl,
      caption: img.caption,
      storage_type: img.storage_type,
      display_order: i,
    }));
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const INTEREST_OPTIONS = ['global', 'regional', 'local', 'personal'];

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

interface SiteFormProps {
  values: Partial<SiteFormValues>;
  onChange: (field: keyof SiteFormValues, value: string | string[]) => void;
  disabled?: boolean;
  allTags?: Tag[];
  onTagCreated?: (tag: Tag) => void;
  /** Show the photo URL field (used in bulk import) */
  showImageUrl?: boolean;
  /** Show drag-drop photo upload zone */
  showPhotoUpload?: boolean;
  /**
   * Site ID for upload path. For existing sites, pass site.id.
   * For new sites, omit — SiteForm will use the generatedId from values.
   * If neither is available, the upload zone shows a hint.
   */
  siteId?: string | null;
  /** Links list — parent-controlled */
  links?: LinkEntry[];
  onLinksChange?: (links: LinkEntry[]) => void;
  /**
   * Called whenever photo state changes.
   * Parent should store latest value in a ref and read it on submit.
   * The second arg indicates whether any upload is in progress.
   */
  onImagesChange?: (images: ImageEntry[], anyUploading: boolean) => void;
  /** Pre-populate photos — only read at mount */
  initialImages?: ImageEntry[];
}

export function SiteForm({
  values,
  onChange,
  disabled = false,
  allTags,
  onTagCreated,
  showImageUrl = false,
  showPhotoUpload = false,
  siteId,
  links,
  onLinksChange,
  onImagesChange,
  initialImages,
}: SiteFormProps) {
  const country = values.country ?? '';
  const region = values.region ?? '';
  const municipality = values.municipality ?? '';
  const name = values.name ?? '';

  const generatedId =
    country && municipality && name
      ? generateSiteId(country, municipality, name)
      : null;

  const uploadSiteId = siteId ?? generatedId;

  const inputCls = `w-full border rounded-lg px-3 py-2 text-[16px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-navy-300 ${
    disabled ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-white'
  }`;
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  // ── Geocoding state ──────────────────────────────────────────
  const [geocoding, setGeocoding] = useState(false);
  const prevCoordsRef = useRef<{ lat: string; lon: string } | null>(null);

  useEffect(() => {
    if (disabled) return;

    const lat = values.latitude ?? '';
    const lon = values.longitude ?? '';
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (
      !lat || !lon ||
      isNaN(latNum) || isNaN(lonNum) ||
      latNum < -90 || latNum > 90 ||
      lonNum < -180 || lonNum > 180
    ) return;

    if (prevCoordsRef.current?.lat === lat && prevCoordsRef.current?.lon === lon) return;

    const timer = setTimeout(async () => {
      prevCoordsRef.current = { lat, lon };
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&accept-language=en`,
          { headers: { 'User-Agent': 'OrbissDei/1.0 (orbisdei.org)' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const addr = data?.address;
        if (!addr) return;

        const extractedCountry = (addr.country_code as string | undefined)?.toUpperCase();
        const extractedRegion =
          addr.state ?? addr.province ?? addr.region ?? addr.county ?? undefined;
        const extractedMunicipality =
          addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.hamlet ?? undefined;

        if (extractedCountry && !(values.country ?? '')) onChange('country', extractedCountry);
        if (extractedRegion && !(values.region ?? '')) onChange('region', extractedRegion);
        if (extractedMunicipality && !(values.municipality ?? '')) onChange('municipality', extractedMunicipality);
      } catch {
        // silently ignore — user can fill manually
      } finally {
        setGeocoding(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [values.latitude, values.longitude, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo upload state (managed internally) ─────────────────
  const [images, setImages] = useState<ImageEntry[]>(initialImages ?? []);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep a stable ref to onImagesChange so uploadFiles doesn't go stale
  const onImagesChangeRef = useRef(onImagesChange);
  onImagesChangeRef.current = onImagesChange;

  const updateImages = useCallback((updater: (prev: ImageEntry[]) => ImageEntry[]) => {
    setImages((prev) => updater(prev));
  }, []);

  useEffect(() => {
    onImagesChangeRef.current?.(images, images.some((img) => img.uploading));
  }, [images]);

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

        updateImages((prev) => [
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
          formData.append('site_id', uploadSiteId!);

          const res = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }

          const { url } = await res.json();
          updateImages((prev) =>
            prev.map((img) =>
              img.id === tempId ? { ...img, uploading: false, finalUrl: url } : img
            )
          );
        } catch (err) {
          updateImages((prev) =>
            prev.map((img) =>
              img.id === tempId
                ? { ...img, uploading: false, error: (err as Error).message }
                : img
            )
          );
        }
      }
    },
    [uploadSiteId, updateImages]
  );

  // ── Links helpers ────────────────────────────────────────────
  const addLink = () =>
    onLinksChange?.([
      ...(links ?? []),
      { id: crypto.randomUUID(), link_type: '', url: '', comment: '' },
    ]);

  const removeLink = (id: string) =>
    onLinksChange?.((links ?? []).filter((l) => l.id !== id));

  const updateLink = (id: string, field: keyof Omit<LinkEntry, 'id'>, value: string) =>
    onLinksChange?.(
      (links ?? []).map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Name */}
      <div className="col-span-2">
        <label className={labelCls}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
        {generatedId && (
          <p className="mt-0.5 text-[11px] text-gray-400 font-mono">ID: {generatedId}</p>
        )}
      </div>

      {/* Native name */}
      <div className="col-span-2">
        <label className={labelCls}>
          Name in the local language{' '}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={values.native_name ?? ''}
          onChange={(e) => onChange('native_name', e.target.value)}
          disabled={disabled}
          placeholder="e.g. Basilique Sainte-Thérèse de Lisieux"
          className={inputCls}
        />
      </div>

      {/* Country + Region + Municipality */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>
            Country code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => onChange('country', e.target.value.toUpperCase().slice(0, 2))}
            disabled={disabled}
            placeholder="FR"
            maxLength={2}
            className={`${inputCls} font-mono uppercase ${
              country && country.length !== 2 ? 'border-red-400' : ''
            }`}
          />
        </div>
        <div>
          <label className={labelCls}>
            Region <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => onChange('region', e.target.value)}
            disabled={disabled}
            placeholder="e.g. Lazio"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            Municipality <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={municipality}
            onChange={(e) => onChange('municipality', e.target.value)}
            disabled={disabled}
            placeholder="e.g. Rome"
            className={inputCls}
          />
        </div>
      </div>

      {/* Short description */}
      <div className="col-span-2">
        <label className={labelCls}>Short description</label>
        <textarea
          rows={2}
          value={values.short_description ?? ''}
          onChange={(e) => onChange('short_description', e.target.value)}
          disabled={disabled}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Lat / Lng */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Latitude</label>
          <input
            type="text"
            value={values.latitude ?? ''}
            onChange={(e) => onChange('latitude', e.target.value)}
            disabled={disabled}
            className={`${inputCls} font-mono`}
          />
        </div>
        <div>
          <label className={labelCls}>Longitude</label>
          <input
            type="text"
            value={values.longitude ?? ''}
            onChange={(e) => onChange('longitude', e.target.value)}
            disabled={disabled}
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      {geocoding && (
        <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          Looking up location…
        </p>
      )}

      {/* Google Maps URL */}
      <div className="col-span-2">
        <label className={labelCls}>Google Maps URL</label>
        <input
          type="text"
          value={values.google_maps_url ?? ''}
          onChange={(e) => onChange('google_maps_url', e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      </div>

      {/* Interest */}
      <div>
        <label className={labelCls}>Interest level</label>
        <select
          value={values.interest ?? ''}
          onChange={(e) => onChange('interest', e.target.value)}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">— Select —</option>
          {INTEREST_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {/* Photo URL (import only) */}
      {showImageUrl && (
        <div>
          <label className={labelCls}>Photo URL</label>
          <input
            type="text"
            value={values.image_url ?? ''}
            onChange={(e) => onChange('image_url', e.target.value)}
            disabled={disabled}
            placeholder="https://…"
            className={`${inputCls} font-mono`}
          />
        </div>
      )}

      {/* Tags */}
      {allTags !== undefined && onTagCreated !== undefined && (
        <div>
          <label className={labelCls}>Tags</label>
          <TagMultiSelect
            allTags={allTags}
            selectedIds={values.tag_ids ?? []}
            onChange={(ids) => onChange('tag_ids', ids)}
            onTagCreated={onTagCreated}
            disabled={disabled}
            placeholder="Search or create tags…"
          />
        </div>
      )}

      {/* Links */}
      {links !== undefined && onLinksChange !== undefined && (
        <div>
          <label className={labelCls}>Links</label>
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <div key={link.id} className="flex flex-col gap-1.5">
                <div className="flex flex-col md:flex-row gap-1.5 md:gap-2 md:items-start">
                  <input
                    type="text"
                    placeholder="e.g. Official Website, Wikipedia…"
                    value={link.link_type}
                    onChange={(e) => updateLink(link.id, 'link_type', e.target.value)}
                    disabled={disabled}
                    className={`${inputCls} md:w-[210px] md:shrink-0`}
                    aria-label="Link type"
                  />
                  <div className="flex gap-2 items-start flex-1 min-w-0">
                    <input
                      type="url"
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                      disabled={disabled}
                      className={`${inputCls} flex-1 min-w-0 font-mono`}
                      aria-label="Link URL"
                    />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => removeLink(link.id)}
                        className="mt-1.5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
                        aria-label="Remove link"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Optional comment about this link…"
                  value={link.comment}
                  onChange={(e) => updateLink(link.id, 'comment', e.target.value)}
                  disabled={disabled}
                  className={inputCls}
                  aria-label="Link comment"
                />
              </div>
            ))}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={addLink}
              className="mt-2 inline-flex items-center gap-1 text-[13px] text-navy-700 font-medium hover:text-navy-500"
            >
              <Plus size={14} />
              Add link
            </button>
          )}
        </div>
      )}

      {/* Photos upload */}
      {showPhotoUpload && (
        <div>
          <label className={labelCls}>Photos</label>

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                >
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />

                  {img.uploading && (
                    <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-end">
                      <div className="w-full h-1 bg-gray-200">
                        <div className="h-1 bg-navy-700 animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}

                  {img.error && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-[9px] text-red-700 font-medium px-1 text-center">Error</span>
                    </div>
                  )}

                  {img.removed && <div className="absolute inset-0 bg-red-500/40" />}

                  {!img.uploading && !disabled && (
                    <button
                      type="button"
                      onClick={() =>
                        updateImages((prev) =>
                          prev.map((i) => (i.id === img.id ? { ...i, removed: !i.removed } : i))
                        )
                      }
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

          {uploadErrors.length > 0 && (
            <div className="mb-2 space-y-1">
              {uploadErrors.map((err, i) => (
                <p key={i} className="text-[12px] text-[#a32d2d]">{err}</p>
              ))}
            </div>
          )}

          {!uploadSiteId ? (
            <p className="text-[12px] text-gray-400 border border-dashed border-gray-300 rounded-lg p-4 text-center">
              Fill in country, municipality, and name to enable photo upload.
            </p>
          ) : (
            <>
              <div
                onClick={() => !disabled && fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (!disabled && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
                }}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-[1.5px] border-dashed rounded-lg p-6 text-center transition-colors ${
                  disabled
                    ? 'border-gray-200 bg-gray-50 cursor-default'
                    : isDragging
                    ? 'border-navy-400 bg-navy-50 cursor-pointer'
                    : 'border-gray-300 bg-white hover:border-gray-400 cursor-pointer'
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
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
