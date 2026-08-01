import type { LinkEntry, CelebrationEntry } from '@/lib/types';
import type { SiteFormValues, ImageEntry } from '@/components/admin/SiteForm';

/**
 * localStorage-backed draft persistence for the /admin/research reviewer.
 *
 * Why this exists: every SiteForm-based flow in this codebase holds its
 * editor state in plain React state and only writes on the terminal submit
 * click — close the tab mid-review and the work is gone. That's tolerable on
 * a desktop edit page; it isn't on a page explicitly built to be used from a
 * phone in the field, where backgrounding the browser, losing signal, or a
 * tab eviction are all routine. (The research triage page this reviewer
 * replaced had exactly this resilience; rebuilding it on SiteForm dropped it.)
 *
 * Scope is deliberately drafts ONLY — not an offline action queue. Approving
 * a submission is a multi-table, non-idempotent write (createSiteWithRelations,
 * or /api/publish-site-edit); blindly replaying a queued approval after
 * reconnect risks duplicate sites. So the reviewer disables Approve/Reject
 * while offline and keeps the admin's edits safe until they're back online,
 * rather than pretending an approval succeeded.
 */

const DRAFTS_KEY = 'orbisdei-review-drafts-v1';

export interface ReviewDraft {
  values: SiteFormValues;
  links: LinkEntry[];
  celebrations: CelebrationEntry[];
  images: ImageEntry[];
  hasNoImage: boolean;
  reviewNote: string;
  savedAt: number;
}

export type ReviewDrafts = Record<string, ReviewDraft>;

/**
 * Images safe to persist across a reload. A freshly-picked file's previewUrl
 * is a `blob:` URL owned by the page that created it — it dies with that
 * document, so restoring one would render a permanently broken thumbnail.
 * Entries mid-upload are dropped for the same reason (no finalUrl yet, and
 * the upload won't resume). Anything already uploaded (finalUrl set) or
 * already stored server-side (!isNew) survives, with previewUrl rewritten to
 * the durable URL.
 */
function persistableImages(images: ImageEntry[]): ImageEntry[] {
  return images
    .filter((img) => !img.uploading && (img.finalUrl || !img.isNew))
    .map((img) => ({
      ...img,
      previewUrl: img.finalUrl ?? img.previewUrl,
      error: undefined,
    }))
    .filter((img) => !img.previewUrl.startsWith('blob:'));
}

/**
 * Stable fingerprint of the meaningful parts of an image list, used to tell a
 * real user edit from ImageUploader's mount-time onImagesChange callback.
 * Deliberately ignores the client-side `id` (regenerated on every
 * payloadToImageEntries call) and ordering-independent bookkeeping fields.
 */
export function imagesSignature(images: ImageEntry[]): string {
  return images
    .filter((img) => !img.removed)
    .map((img) => `${img.finalUrl ?? img.previewUrl}|${img.caption}|${img.attribution}`)
    .join('~');
}

export function readDrafts(): ReviewDrafts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as ReviewDrafts) : {};
  } catch {
    return {};
  }
}

function writeDrafts(drafts: ReviewDrafts) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Quota exceeded or storage disabled — non-fatal. The in-memory edit
    // state is still correct; only crash-resilience is lost.
  }
}

export function saveDraft(
  submissionId: string,
  draft: Omit<ReviewDraft, 'savedAt' | 'images'> & { images: ImageEntry[] }
) {
  const drafts = readDrafts();
  drafts[submissionId] = {
    ...draft,
    images: persistableImages(draft.images),
    savedAt: Date.now(),
  };
  writeDrafts(drafts);
}

export function clearDraft(submissionId: string) {
  const drafts = readDrafts();
  if (!(submissionId in drafts)) return;
  delete drafts[submissionId];
  writeDrafts(drafts);
}

/**
 * Drops drafts for submissions that are no longer pending — approved or
 * rejected elsewhere (the desktop panel, another device, another tab).
 * Without this, localStorage accumulates drafts for submissions that will
 * never appear in this list again.
 */
export function pruneDrafts(livePendingIds: string[]): ReviewDrafts {
  const drafts = readDrafts();
  const live = new Set(livePendingIds);
  let changed = false;
  for (const id of Object.keys(drafts)) {
    if (!live.has(id)) {
      delete drafts[id];
      changed = true;
    }
  }
  if (changed) writeDrafts(drafts);
  return drafts;
}
