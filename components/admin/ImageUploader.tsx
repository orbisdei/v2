'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, GripVertical, Search, Plus, ChevronRight } from 'lucide-react';
import type { ImageEntry } from './SiteForm';

interface PhotoResult {
  source: 'wikimedia' | 'unsplash';
  url: string;
  thumbnail_url: string;
  attribution: string;
  license: string;
  title?: string;
}

interface ImageUploaderProps {
  /** 'site' = multi-image with reorder; 'tag' = single image, no reorder */
  mode: 'site' | 'tag';
  /** Entity ID for upload path — site slug or tag slug. If null, show hint to fill required fields first. */
  entityId: string | null;
  /** Called whenever images state changes */
  onImagesChange?: (images: ImageEntry[], anyUploading: boolean) => void;
  /** Initial images to pre-populate (read once at mount) */
  initialImages?: ImageEntry[];
  /** Disabled state */
  disabled?: boolean;
  /** Pre-populates the photo search field. Pass the site or tag name. */
  searchName?: string;
  /** Whether the current user is an admin (controls checkbox visibility) */
  isAdmin?: boolean;
  /** Current value of the has_no_image flag */
  hasNoImage?: boolean;
  /** Called when the admin toggles the no-image flag */
  onHasNoImageChange?: (value: boolean) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
        0.85,
      );
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function ImageUploader({
  mode,
  entityId,
  onImagesChange,
  initialImages,
  disabled = false,
  searchName,
  isAdmin = false,
  hasNoImage = false,
  onHasNoImageChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageEntry[]>(initialImages ?? []);
  const [showNoImageWarning, setShowNoImageWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [scrapingFromUrl, setScrapingFromUrl] = useState<{ [imgId: string]: string }>({});
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [autoFilledIds, setAutoFilledIds] = useState<Record<string, boolean>>({});
  const [photoSearchTerm, setPhotoSearchTerm] = useState(searchName ?? '');
  const [photoSources, setPhotoSources] = useState<('wikimedia' | 'unsplash')[]>(['wikimedia']);
  const [photoSearchResults, setPhotoSearchResults] = useState<PhotoResult[] | null>(null);
  const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImagesChangeRef = useRef(onImagesChange);
  onImagesChangeRef.current = onImagesChange;

  const updateImages = useCallback((updater: (prev: ImageEntry[]) => ImageEntry[]) => {
    setImages((prev) => updater(prev));
  }, []);

  useEffect(() => {
    onImagesChangeRef.current?.(images, images.some((img) => img.uploading));
  }, [images]);

  function handleNoImageToggle(checked: boolean) {
    if (checked) {
      const activeImages = images.filter((img) => !img.removed);
      if (activeImages.length > 0) {
        setShowNoImageWarning(true);
      } else {
        onHasNoImageChange?.(true);
      }
    } else {
      setShowNoImageWarning(false);
      onHasNoImageChange?.(false);
    }
  }

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const errors: string[] = [];
      const validFiles: File[] = [];

      Array.from(files).forEach((file) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: unsupported type (JPEG, PNG, WebP only)`);
        } else {
          validFiles.push(file);
        }
      });

      setUploadErrors(errors);

      // Tag mode: only process one file, replacing the existing image
      const filesToProcess = mode === 'tag' ? validFiles.slice(0, 1) : validFiles;

      for (const file of filesToProcess) {
        // In tag mode, mark existing non-removed images as removed first
        if (mode === 'tag') {
          updateImages((prev) => prev.map((img) => (img.removed ? img : { ...img, removed: true })));
        }

        const tempId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        updateImages((prev) => [
          ...prev,
          {
            id: tempId,
            previewUrl,
            finalUrl: null,
            caption: '',
            attribution: '',
            storage_type: 'local',
            display_order: prev.filter((i) => !i.removed).length,
            removed: false,
            isNew: true,
            uploading: true,
          },
        ]);

        try {
          const resized = await resizeImage(file);
          const formData = new FormData();
          formData.append('file', resized, file.name.replace(/\.[^.]+$/, '.jpg'));

          let res: Response;
          if (mode === 'site') {
            formData.append('site_id', entityId!);
            res = await fetch('/api/upload-image', { method: 'POST', body: formData });
          } else {
            formData.append('tag_id', entityId!);
            res = await fetch('/api/upload-tag-image', { method: 'POST', body: formData });
          }

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Upload failed');
          }

          const { url } = await res.json();
          updateImages((prev) =>
            prev.map((img) => (img.id === tempId ? { ...img, uploading: false, finalUrl: url } : img)),
          );
        } catch (err) {
          updateImages((prev) =>
            prev.map((img) =>
              img.id === tempId ? { ...img, uploading: false, error: (err as Error).message } : img,
            ),
          );
        }
      }
    },
    [entityId, mode, updateImages],
  );

  const reorderImages = (fromIdx: number, toIdx: number) => {
    updateImages((prev) => {
      const visible = prev.filter((img) => !img.removed);
      const removed = prev.filter((img) => img.removed);
      const item = visible[fromIdx];
      const without = [...visible.slice(0, fromIdx), ...visible.slice(fromIdx + 1)];
      without.splice(toIdx, 0, item);
      return [...without.map((img, i) => ({ ...img, display_order: i })), ...removed];
    });
  };

  const handleScrapeAttribution = async (imgId: string, url: string) => {
    setScrapingId(imgId);
    try {
      const res = await fetch('/api/scrape-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.attribution) {
        updateImages((prev) =>
          prev.map((img) => (img.id === imgId ? { ...img, attribution: data.attribution } : img)),
        );
      }
    } catch {
      // silently fail — user can type manually
    } finally {
      setScrapingId(null);
    }
  };

  const handleScrapeFromUrl = async (imgId: string, url: string) => {
    if (!url.trim()) return;
    setScrapingFromUrl((prev) => ({ ...prev, [imgId]: url }));
    try {
      const res = await fetch('/api/scrape-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.attribution) {
        updateImages((prev) =>
          prev.map((img) => (img.id === imgId ? { ...img, attribution: data.attribution } : img)),
        );
        setScrapingFromUrl((prev) => {
          const next = { ...prev };
          delete next[imgId];
          return next;
        });
      }
    } catch {
      // silently fail
    } finally {
      setScrapingFromUrl((prev) => {
        const next = { ...prev };
        delete next[imgId];
        return next;
      });
    }
  };

  const handleImportFromUrl = async (urlOverride?: string) => {
    const url = urlOverride ?? importUrl;
    if (!url.trim() || !entityId) return;
    setImporting(true);
    setImportError(null);

    try {
      // In tag mode, mark existing non-removed images as removed
      if (mode === 'tag') {
        updateImages((prev) => prev.map((img) => (img.removed ? img : { ...img, removed: true })));
      }

      const res = await fetch('/api/import-image-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), entity_type: mode, entity_id: entityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      const newId = crypto.randomUUID();
      updateImages((prev) => [
        ...prev,
        {
          id: newId,
          previewUrl: data.url,
          finalUrl: data.url,
          caption: '',
          attribution: data.attribution ?? '',
          storage_type: 'local',
          display_order: prev.filter((i) => !i.removed).length,
          removed: false,
          isNew: true,
          uploading: false,
        },
      ]);

      if (data.attribution) {
        setAutoFilledIds((prev) => ({ ...prev, [newId]: true }));
        setTimeout(() => {
          setAutoFilledIds((prev) => {
            const next = { ...prev };
            delete next[newId];
            return next;
          });
        }, 3000);
      }

      if (!urlOverride) setImportUrl('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  async function handlePhotoSearch() {
    if (photoSources.length === 0 || !photoSearchTerm.trim()) return;
    setPhotoSearchResults(null);
    setPhotoSearchLoading(true);
    try {
      const res = await fetch('/api/admin/search-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: photoSearchTerm,
          sources: photoSources,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Search failed');
      }
      const data = await res.json();
      setPhotoSearchResults(data.results ?? []);
    } catch {
      // silently fail — error would be a 403 for non-admins
    } finally {
      setPhotoSearchLoading(false);
    }
  }

  const inputCls = `w-full border rounded-lg px-3 py-2 text-[16px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-navy-300 ${
    disabled ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-white'
  }`;

  const activeImages = images.filter((img) => !img.removed);
  const hasActiveImage = activeImages.length > 0;

  const renderImageRow = (img: ImageEntry, visibleIdx: number, draggable: boolean) => (
    <div
      key={img.id}
      draggable={draggable && !disabled}
      onDragStart={
        draggable
          ? (e) => {
              setDragIdx(visibleIdx);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setDragImage(new Image(), 0, 0);
            }
          : undefined
      }
      onDragOver={
        draggable
          ? (e) => {
              e.preventDefault();
              setDragOverIdx(visibleIdx);
            }
          : undefined
      }
      onDragLeave={
        draggable
          ? (e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverIdx(null);
              }
            }
          : undefined
      }
      onDragEnd={
        draggable
          ? () => {
              if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                reorderImages(dragIdx, dragOverIdx);
              }
              setDragIdx(null);
              setDragOverIdx(null);
            }
          : undefined
      }
      className={`flex items-start gap-2 p-2 rounded-lg border transition-colors ${
        draggable && dragIdx === visibleIdx ? 'opacity-30' : ''
      } ${
        draggable && dragOverIdx === visibleIdx && dragIdx !== visibleIdx
          ? 'border-t-2 border-navy-400'
          : 'border-gray-200'
      }`}
    >
      {/* Grip handle — site mode only */}
      {draggable && !disabled && (
        <div className="mt-1 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} className="text-gray-400" />
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
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
      </div>

      {/* Right side: inputs + remove */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* Caption */}
        <input
          type="text"
          placeholder="Caption (optional)"
          value={img.caption}
          onChange={(e) =>
            updateImages((prev) =>
              prev.map((i) => (i.id === img.id ? { ...i, caption: e.target.value } : i)),
            )
          }
          disabled={disabled}
          className={`${inputCls} text-[12px]`}
        />

        {/* Attribution */}
        <div className="flex gap-2 items-start">
          <input
            type="text"
            placeholder="Attribution (e.g. Photo by…, License)"
            value={img.attribution}
            onChange={(e) =>
              updateImages((prev) =>
                prev.map((i) => (i.id === img.id ? { ...i, attribution: e.target.value } : i)),
              )
            }
            disabled={disabled}
            className={`${inputCls} text-[12px]`}
          />
          {!disabled && autoFilledIds[img.id] ? (
            <span className="shrink-0 text-[10px] text-green-600 font-medium whitespace-nowrap mt-2">
              Auto-filled ✓
            </span>
          ) : !disabled &&
            (img.finalUrl?.startsWith('http') || img.previewUrl.startsWith('http')) ? (
            <button
              type="button"
              onClick={() => handleScrapeAttribution(img.id, img.finalUrl || img.previewUrl)}
              disabled={scrapingId === img.id}
              className="shrink-0 text-[11px] text-navy-600 hover:text-navy-800 font-medium whitespace-nowrap disabled:opacity-50 mt-1.5"
            >
              {scrapingId === img.id ? 'Fetching…' : 'Auto-fill'}
            </button>
          ) : null}
        </div>

        {/* Standalone URL scrape */}
        {!disabled && scrapingFromUrl[img.id] === undefined && (
          <button
            type="button"
            onClick={() => setScrapingFromUrl((prev) => ({ ...prev, [img.id]: '' }))}
            className="text-[10px] text-navy-600 hover:text-navy-800 font-medium text-left"
          >
            Or paste a source URL to auto-fill →
          </button>
        )}
        {!disabled && scrapingFromUrl[img.id] !== undefined && (
          <div className="flex gap-2 items-start">
            <input
              type="url"
              placeholder="https://example.com"
              value={scrapingFromUrl[img.id]}
              onChange={(e) =>
                setScrapingFromUrl((prev) => ({ ...prev, [img.id]: e.target.value }))
              }
              className={`${inputCls} text-[12px] flex-1`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleScrapeFromUrl(img.id, scrapingFromUrl[img.id])}
              disabled={!scrapingFromUrl[img.id].trim()}
              className="shrink-0 text-[11px] text-navy-600 hover:text-navy-800 font-medium whitespace-nowrap disabled:opacity-50 mt-1.5"
            >
              Fetch
            </button>
          </div>
        )}
      </div>

      {/* Remove button */}
      {!img.uploading && !disabled && (
        <button
          type="button"
          onClick={() =>
            updateImages((prev) =>
              prev.map((i) => (i.id === img.id ? { ...i, removed: !i.removed } : i)),
            )
          }
          className="mt-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center flex-shrink-0"
          aria-label="Remove photo"
        >
          <X size={10} className="text-white" />
        </button>
      )}
    </div>
  );

  const renderUrlImport = (compact = false) => (
    <>
      {!compact && (
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or import from URL</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      )}
      <div className={compact ? 'mt-2' : ''}>
        <div className="flex gap-2 items-start">
          <input
            type="url"
            placeholder="https://commons.wikimedia.org/wiki/File:…"
            value={importUrl}
            onChange={(e) => {
              setImportUrl(e.target.value);
              setImportError(null);
            }}
            disabled={disabled || importing || !entityId || hasNoImage}
            className={`${inputCls} text-[12px] flex-1`}
          />
          <button
            type="button"
            onClick={() => handleImportFromUrl()}
            disabled={disabled || importing || !importUrl.trim() || !entityId || hasNoImage}
            className="shrink-0 border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {importing ? <Loader2 size={12} className="animate-spin" /> : 'Import'}
          </button>
        </div>
        {!compact && (
          <p className="text-[10px] text-gray-400 mt-1">
            Paste a Wikimedia Commons, Flickr, or any image URL to import and auto-fill attribution.
          </p>
        )}
        {importError && <p className="text-[11px] text-red-600 mt-1">{importError}</p>}
      </div>
    </>
  );

  const renderPhotoSearch = () => (
    <>
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or search for photos</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {(['wikimedia', 'unsplash'] as const).map((src) => (
              <label key={src} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={photoSources.includes(src)}
                  onChange={(e) =>
                    setPhotoSources((prev) =>
                      e.target.checked ? [...prev, src] : prev.filter((s) => s !== src)
                    )
                  }
                  className="w-3 h-3"
                />
                {src === 'wikimedia' ? 'Wikimedia' : 'Unsplash'}
              </label>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-1 min-w-[200px]">
            <input
              type="text"
              value={photoSearchTerm}
              onChange={(e) => setPhotoSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePhotoSearch(); }}
              placeholder="Search term…"
              disabled={photoSearchLoading}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            />
            <button
              type="button"
              onClick={handlePhotoSearch}
              disabled={photoSearchLoading || photoSources.length === 0 || !photoSearchTerm.trim()}
              className="shrink-0 inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-60"
            >
              {photoSearchLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              {photoSearchLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {photoSearchResults !== null && (
          <>
            {photoSearchResults.length === 0 ? (
              <p className="text-xs text-gray-400">No results found.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {photoSearchResults.map((photo, i) => (
                  <div key={i} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleImportFromUrl(photo.url)}
                      disabled={importing}
                      title={photo.title ?? photo.attribution}
                      className="relative w-full overflow-hidden rounded-lg border-2 border-transparent hover:border-navy-400 transition-all block disabled:opacity-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.title ?? ''}
                        className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-150"
                      />
                      <span
                        className={`absolute bottom-1 left-1 text-[9px] font-bold px-1 py-0.5 rounded text-white ${
                          photo.source === 'wikimedia' ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                      >
                        {photo.source === 'wikimedia' ? 'WM' : 'UN'}
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <Plus size={20} className="text-white" />
                      </span>
                    </button>
                    {/* Expand / lightbox button */}
                    <button
                      type="button"
                      onClick={() => setLightboxIdx(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Preview"
                    >
                      <Search size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photoSearchResults !== null && photoSearchResults.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-[80vw] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxIdx(null)}
              className="absolute top-2 right-2 z-10 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              <X size={14} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSearchResults[lightboxIdx].url}
              alt={photoSearchResults[lightboxIdx].title ?? ''}
              className="max-w-[80vw] max-h-[70vh] object-contain"
            />
            <div className="px-4 py-3 flex items-center gap-3 border-t border-gray-100 bg-white">
              <div className="flex-1 min-w-0">
                {photoSearchResults[lightboxIdx].title && (
                  <p className="text-xs font-medium text-gray-700 truncate">{photoSearchResults[lightboxIdx].title}</p>
                )}
                <p className="text-[10px] text-gray-500 truncate">{photoSearchResults[lightboxIdx].attribution}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleImportFromUrl(photoSearchResults[lightboxIdx].url);
                  setLightboxIdx(null);
                }}
                disabled={importing}
                className="shrink-0 inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                <Plus size={12} /> Import
              </button>
            </div>
            {lightboxIdx > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIdx((i) => (i ?? 1) - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            {lightboxIdx < photoSearchResults.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIdx((i) => (i ?? 0) + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div>
      {/* Admin: no-image checkbox (site mode only) */}
      {isAdmin && mode === 'site' && (
        <div className="mb-3">
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={hasNoImage}
              onChange={(e) => handleNoImageToggle(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-navy-700 focus:ring-navy-300"
            />
            <span className="text-[13px] text-gray-600 font-medium">
              Site does not have an image
            </span>
          </label>

          {/* Confirmation warning */}
          {showNoImageWarning && (
            <div className="mt-2 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-amber-600 text-[13px] flex-1">
                This will remove all existing images. Continue?
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    updateImages((prev) => prev.map((img) => ({ ...img, removed: true })));
                    onHasNoImageChange?.(true);
                    setShowNoImageWarning(false);
                  }}
                  className="text-[12px] font-medium text-red-700 hover:underline"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoImageWarning(false)}
                  className="text-[12px] font-medium text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image list */}
      {images.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {/* Non-removed images */}
          {images
            .filter((img) => !img.removed)
            .map((img, visibleIdx) => renderImageRow(img, visibleIdx, mode === 'site'))}

          {/* Removed images (greyed out) */}
          {images
            .filter((img) => img.removed)
            .map((img) => (
              <div
                key={img.id}
                className="flex items-start gap-2 p-2 rounded-lg border border-gray-200 opacity-50"
              >
                <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-red-500/40" />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    value={img.caption}
                    readOnly
                    className={`${inputCls} text-[12px]`}
                  />
                  <input
                    type="text"
                    placeholder="Attribution"
                    value={img.attribution}
                    readOnly
                    className={`${inputCls} text-[12px]`}
                  />
                </div>
                {!img.uploading && !disabled && (
                  <button
                    type="button"
                    onClick={() =>
                      updateImages((prev) =>
                        prev.map((i) => (i.id === img.id ? { ...i, removed: !i.removed } : i)),
                      )
                    }
                    className="mt-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center flex-shrink-0"
                    aria-label="Restore photo"
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
            <p key={i} className="text-[12px] text-[#a32d2d]">
              {err}
            </p>
          ))}
        </div>
      )}

      {!entityId ? (
        <p className="text-[12px] text-gray-400 border border-dashed border-gray-300 rounded-lg p-4 text-center">
          {mode === 'site'
            ? 'Fill in country, municipality, and name to enable photo upload.'
            : 'Fill in the tag name to enable image upload.'}
        </p>
      ) : mode === 'tag' && hasActiveImage ? (
        // Tag mode with existing image: compact replacement zone
        <>
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!disabled && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border border-dashed rounded-lg p-3 transition-colors ${
              disabled
                ? 'border-gray-200 bg-gray-50 cursor-default'
                : isDragging
                ? 'border-navy-400 bg-navy-50 cursor-pointer'
                : 'border-gray-300 bg-white hover:border-gray-400 cursor-pointer'
            }`}
          >
            <p className="text-[12px] text-gray-500 text-center">
              Drop a replacement or import from URL
            </p>
            {/* Stop clicks inside URL import from triggering the file picker */}
            <div onClick={(e) => e.stopPropagation()}>{renderUrlImport(true)}</div>
          </div>
          {!disabled && renderPhotoSearch()}
        </>
      ) : (
        // Full drag-drop zone + URL import
        <>
          <div
            onClick={() => !(disabled || hasNoImage) && fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!(disabled || hasNoImage) && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!(disabled || hasNoImage)) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-[1.5px] border-dashed rounded-lg p-6 text-center transition-colors ${
              disabled || hasNoImage
                ? 'border-gray-200 bg-gray-50 cursor-default'
                : isDragging
                ? 'border-navy-400 bg-navy-50 cursor-pointer'
                : 'border-gray-300 bg-white hover:border-gray-400 cursor-pointer'
            }`}
          >
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-[12px] md:text-[13px] text-gray-500">
              Drag {mode === 'tag' ? 'an image' : 'photos'} here or click to browse
            </p>
            <p className="text-[11px] text-gray-400 mt-1">JPEG, PNG, or WebP</p>
          </div>
          {renderUrlImport()}
          {!disabled && renderPhotoSearch()}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={mode === 'site'}
        disabled={disabled || hasNoImage}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
