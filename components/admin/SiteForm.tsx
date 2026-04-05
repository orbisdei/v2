'use client';

import { useState, useRef, useEffect } from 'react';
import { generateSiteId } from '@/lib/utils';
import TagMultiSelect from './TagMultiSelect';
import ImageUploader from './ImageUploader';
import type { Tag } from '@/lib/types';
import { Plus, X, Loader2 } from 'lucide-react';

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
  attribution: string;
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
      attribution: img.attribution,
      storage_type: img.storage_type,
      display_order: i,
    }));
}

const INTEREST_OPTIONS = ['global', 'regional', 'local', 'personal'];

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
  /**
   * When true, disables automatic geocoding on coordinate change.
   * Region can be filled manually via the "Auto-Fill" link.
   */
  isEditMode?: boolean;
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
  isEditMode = false,
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

  // Auto-geocode on coordinate change (new sites only)
  useEffect(() => {
    if (disabled || isEditMode) return;

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
  }, [values.latitude, values.longitude, disabled, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual region auto-fill (edit mode only)
  async function handleAutoFillRegion() {
    const lat = values.latitude ?? '';
    const lon = values.longitude ?? '';
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!lat || !lon || isNaN(latNum) || isNaN(lonNum)) return;
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
      const extractedRegion =
        addr.state ?? addr.province ?? addr.region ?? addr.county ?? undefined;
      if (extractedRegion) onChange('region', extractedRegion);
    } catch {
      // silently ignore
    } finally {
      setGeocoding(false);
    }
  }

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
          <div className="flex items-center justify-between mb-1">
            <label className={`${labelCls} mb-0`}>
              Region <span className="font-normal text-gray-400">(optional)</span>
            </label>
            {isEditMode && !disabled && (
              <button
                type="button"
                onClick={handleAutoFillRegion}
                disabled={geocoding}
                className="text-[11px] text-navy-600 hover:text-navy-400 font-medium disabled:opacity-50"
              >
                {geocoding ? 'Looking up…' : 'Auto-Fill'}
              </button>
            )}
          </div>
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

      {geocoding && !isEditMode && (
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
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Official Website, Wikipedia…"
                    value={link.link_type}
                    onChange={(e) => updateLink(link.id, 'link_type', e.target.value)}
                    disabled={disabled}
                    className={inputCls}
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
          <ImageUploader
            mode="site"
            entityId={uploadSiteId}
            onImagesChange={onImagesChange}
            initialImages={initialImages}
            disabled={disabled}
            searchName={name}
          />
        </div>
      )}
    </div>
  );
}
