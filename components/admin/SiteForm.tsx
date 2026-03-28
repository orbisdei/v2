'use client';

import { generateSiteId } from '@/lib/utils';
import TagMultiSelect from './TagMultiSelect';
import type { Tag } from '@/lib/types';

export interface SiteFormValues {
  name: string;
  native_name: string;
  country: string;
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
  municipality: '',
  short_description: '',
  latitude: '',
  longitude: '',
  google_maps_url: '',
  interest: '',
  image_url: '',
  tag_ids: [],
};

const INTEREST_OPTIONS = ['global', 'regional', 'local', 'personal'];

interface SiteFormProps {
  values: Partial<SiteFormValues>;
  onChange: (field: keyof SiteFormValues, value: string | string[]) => void;
  disabled?: boolean;
  allTags?: Tag[];
  onTagCreated?: (tag: Tag) => void;
  /** Show the photo URL field (used in bulk import) */
  showImageUrl?: boolean;
}

export function SiteForm({
  values,
  onChange,
  disabled = false,
  allTags,
  onTagCreated,
  showImageUrl = false,
}: SiteFormProps) {
  const country = values.country ?? '';
  const municipality = values.municipality ?? '';
  const name = values.name ?? '';

  const generatedId =
    country && municipality && name
      ? generateSiteId(country, municipality, name)
      : null;

  const inputCls = `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 ${
    disabled ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-white'
  }`;
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

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

      {/* Country + Municipality */}
      <div className="grid grid-cols-2 gap-3">
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
            Municipality <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={municipality}
            onChange={(e) => onChange('municipality', e.target.value)}
            disabled={disabled}
            placeholder="e.g. Lisieux"
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
    </div>
  );
}
