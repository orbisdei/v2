'use client';

import { useState, useRef, useEffect } from 'react';
import { generateSiteId } from '@/lib/utils';
import { reverseGeocode, extractCoordsFromMapsUrl } from '@/lib/geocode';
import TagMultiSelect from './TagMultiSelect';
import ImageUploader from './ImageUploader';
import type { Tag, LinkEntry, CelebrationEntry } from '@/lib/types';
import { SITE_TYPES, SITE_TYPE_LABELS } from '@/lib/types';
import { Loader2, Sparkles } from 'lucide-react';
import { LinkListEditor } from './LinkListEditor';
import { CelebrationListEditor } from './CelebrationListEditor';

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
  type: string; // sites.type classification ('' = unclassified)
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
  type: '',
  image_url: '',
  tag_ids: [],
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

const INTEREST_OPTIONS = ['global', 'regional', 'local', 'topical', 'personal'];

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
  /** Notable Celebrations list — parent-controlled */
  celebrations?: CelebrationEntry[];
  onCelebrationsChange?: (celebrations: CelebrationEntry[]) => void;
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
  /** Whether the current user is an admin — forwarded to ImageUploader */
  isAdmin?: boolean;
  /** Current value of the has_no_image flag — forwarded to ImageUploader */
  hasNoImage?: boolean;
  /** Called when admin toggles the no-image checkbox */
  onHasNoImageChange?: (value: boolean) => void;
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
  celebrations,
  onCelebrationsChange,
  onImagesChange,
  initialImages,
  isEditMode = false,
  isAdmin = false,
  hasNoImage = false,
  onHasNoImageChange,
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

  const inputCls = `w-full border rounded-lg px-3 py-2 text-[16px] md:text-[14px] focus:outline-hidden focus:ring-2 focus:ring-navy-300 ${
    disabled ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-white'
  }`;
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  // ── Geocoding state ──────────────────────────────────────────
  const [geocoding, setGeocoding] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [lookingUpCoords, setLookingUpCoords] = useState(false);
  const [coordLookupError, setCoordLookupError] = useState<string | null>(null);

  async function handleGenerateDescription() {
    setGeneratingDesc(true);
    try {
      const tagNames = (values.tag_ids ?? [])
        .map((id) => allTags?.find((t) => t.id === id)?.name)
        .filter(Boolean) as string[];

      const res = await fetch('/api/generate-site-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: values.name ?? '',
          country: values.country ?? '',
          municipality: values.municipality ?? '',
          tags: tagNames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      const current = values.short_description ?? '';
      onChange('short_description', current ? `${current}\n${data.description}` : data.description);
    } catch {
      // Silently fail — the user can see nothing changed
    } finally {
      setGeneratingDesc(false);
    }
  }
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
        const geo = await reverseGeocode(latNum, lonNum);
        if (geo.country && !(values.country ?? '')) onChange('country', geo.country);
        if (geo.region && !(values.region ?? '')) onChange('region', geo.region);
        if (geo.municipality && !(values.municipality ?? '')) onChange('municipality', geo.municipality);
      } finally {
        setGeocoding(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [values.latitude, values.longitude, disabled, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual coordinate lookup — the one place a user on this form (contribute,
  // edit, admin import, or approvals) can turn a name/address (or a pasted
  // Google Maps link) into lat/lng, rather than being stuck typing them in by
  // hand. Tries the pasted google_maps_url's own embedded coordinates first
  // (no API call — see extractCoordsFromMapsUrl), then falls through to
  // /api/geocode-site's Google Places → Nominatim chain.
  async function handleLookupCoordinates() {
    if (!(values.name ?? '').trim()) return;
    setCoordLookupError(null);
    if ((values.google_maps_url ?? '').trim()) {
      const urlCoords = extractCoordsFromMapsUrl(values.google_maps_url ?? '');
      if (urlCoords) {
        onChange('latitude', String(urlCoords.lat));
        onChange('longitude', String(urlCoords.lon));
        return;
      }
    }
    setLookingUpCoords(true);
    try {
      const res = await fetch('/api/geocode-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          native_name: values.native_name,
          municipality: values.municipality,
          country: values.country,
          google_maps_url: values.google_maps_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.latitude == null || data.longitude == null) {
        setCoordLookupError(data.error || 'No coordinates found.');
        return;
      }
      onChange('latitude', String(data.latitude));
      onChange('longitude', String(data.longitude));
    } catch {
      setCoordLookupError('Lookup failed — try again.');
    } finally {
      setLookingUpCoords(false);
    }
  }

  // Manual region auto-fill — available in both create and edit mode. In
  // create mode this duplicates what the auto-geocode effect above already
  // does on a coordinate change, but that effect only fires once per
  // coordinate value; this is the retry button for when it missed or the
  // admin wants to re-pull region without touching lat/lng.
  async function handleAutoFillRegion() {
    const lat = values.latitude ?? '';
    const lon = values.longitude ?? '';
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!lat || !lon || isNaN(latNum) || isNaN(lonNum)) return;
    setGeocoding(true);
    try {
      const geo = await reverseGeocode(latNum, lonNum);
      if (geo.region) onChange('region', geo.region);
    } finally {
      setGeocoding(false);
    }
  }

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

      {/* Country + Region + Municipality.
          Single column below sm: at phone width a half-width column can't fit
          a label plus its inline action ("Region" + "Auto-Fill"), and the
          fixed-height header row clipped rather than wrapped. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1 min-h-4">
            <label className={`${labelCls} mb-0`}>
              Country code <span className="text-red-500">*</span>
            </label>
          </div>
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
          <div className="flex items-center justify-between gap-2 mb-1 min-h-4">
            <label className={`${labelCls} mb-0`}>
              Region <span className="font-normal text-gray-400">(optional)</span>
            </label>
            {!disabled && (
              <button
                type="button"
                onClick={handleAutoFillRegion}
                disabled={geocoding}
                className="text-[11px] text-navy-600 hover:text-navy-400 font-medium disabled:opacity-50 leading-none"
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
          <div className="flex items-center justify-between gap-2 mb-1 min-h-4">
            <label className={`${labelCls} mb-0`}>
              Municipality <span className="text-red-500">*</span>
            </label>
          </div>
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
        <div className="flex items-center justify-between mb-1">
          <label className={`${labelCls} mb-0`}>Short description</label>
          {!disabled && (
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generatingDesc || !(values.name ?? '').trim()}
              className="inline-flex items-center gap-1 text-[11px] text-navy-600 hover:text-navy-400 font-medium disabled:opacity-50"
            >
              <Sparkles size={12} />
              {generatingDesc ? 'Generating…' : 'Auto-Generate'}
            </button>
          )}
        </div>
        <textarea
          rows={2}
          value={values.short_description ?? ''}
          onChange={(e) => onChange('short_description', e.target.value)}
          disabled={disabled}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Lat / Lng */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1 min-h-4">
          <span className={`${labelCls} mb-0`}>Coordinates</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleLookupCoordinates}
              disabled={lookingUpCoords || !(values.name ?? '').trim()}
              className="text-[11px] text-navy-600 hover:text-navy-400 font-medium disabled:opacity-50 leading-none"
            >
              {lookingUpCoords ? 'Looking up…' : 'Look Up Coordinates'}
            </button>
          )}
        </div>
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
        {coordLookupError && (
          <p className="text-[11px] text-red-500 mt-1">{coordLookupError}</p>
        )}
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
          onChange={(e) => {
            const url = e.target.value;
            onChange('google_maps_url', url);
            // Auto-fill lat/lng from the URL's own encoding when both fields
            // are still empty — never overwrites a value already entered.
            if (!(values.latitude ?? '').trim() && !(values.longitude ?? '').trim()) {
              const coords = extractCoordsFromMapsUrl(url);
              if (coords) {
                onChange('latitude', String(coords.lat));
                onChange('longitude', String(coords.lon));
              }
            }
          }}
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

      {/* Site type */}
      <div>
        <label className={labelCls}>Site type</label>
        <select
          value={values.type ?? ''}
          onChange={(e) => onChange('type', e.target.value)}
          disabled={disabled}
          className={inputCls}
        >
          <option value="">— Select —</option>
          {SITE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SITE_TYPE_LABELS[t]}
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

      {/* Notable Celebrations */}
      {celebrations !== undefined && onCelebrationsChange !== undefined && (
        <div>
          <label className={labelCls}>Notable Celebrations</label>
          <CelebrationListEditor
            celebrations={celebrations}
            onChange={onCelebrationsChange}
            disabled={disabled}
            inputClass={inputCls}
          />
        </div>
      )}

      {/* Links */}
      {links !== undefined && onLinksChange !== undefined && (
        <div>
          <label className={labelCls}>Links</label>
          <LinkListEditor
            links={links}
            onChange={onLinksChange}
            disabled={disabled}
            inputClass={inputCls}
          />
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
            isAdmin={isAdmin}
            hasNoImage={hasNoImage}
            onHasNoImageChange={onHasNoImageChange}
          />
        </div>
      )}
    </div>
  );
}
