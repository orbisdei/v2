'use client';

// Completeness indicator for the /admin/research backlog.
//
// History: the pre-integration research_findings triage page (removed in
// 313a98f, "/admin/research becomes the mobile-friendly pending_submissions
// reviewer") had a single circular ring (`CompletenessRing`) showing overall
// % complete, color-graded green/amber/red by threshold. When that page was
// replaced by this ResearchClient.tsx (reviewing pending_submissions
// instead of research_findings directly), the indicator itself didn't carry
// over — nothing in the new UI shows research completeness at a glance.
//
// This restores it, adapted two ways:
//   1. Data source: reads off a Submission's live editor state (siteForm /
//      links / celebrations / images edits) instead of a ResearchFindingRow,
//      since research_findings rows no longer reach the client directly.
//   2. Shape: a row of individually-lit circles (like a biathlon target)
//      instead of one ring, so a reviewer can see WHICH fields are missing
//      without opening the tooltip that the ring hid it behind. Each circle
//      also gets a third state the ring didn't have — amber for "present,
//      but the row's own research warnings flagged it" — surfaced from the
//      same payload.warnings the "Needs your attention" banner already
//      reads (see toDisplayWarning in ResearchClient.tsx), so this needed no
//      new data.
//
// 2026-08-19 — Location check + confidence badge, from an audit of what
// lib/migrateResearchFindings.ts actually warns about vs. what the original
// 5 circles could show (native name / photo / source link / wikipedia link
// / celebration — all "is the content there" checks). Two real gaps, backed
// by a query against the live pending_submissions queue at the time:
//   - Nothing tracked publishability. Coordinates are the one field that
//     actually blocks going live (assertValidCoordinates in lib/createSite.ts
//     enforces this at approval time) — 6 of 496 pending "create" rows had
//     none at all, invisible on the old 5-circle target. Folded in as a 6th
//     "Location" circle rather than shoehorned into an existing one, since
//     none of the five is really about this. It also encodes a distinction
//     the pipeline doesn't warn about on its own: a Google Maps link built
//     from a plain guessed search string (buildMapsSearchUrl with no
//     placeId — see lib/places.ts) vs. one confirmed against a real Google
//     Places match (query_place_id present). 8 more rows had exactly that
//     gap — coordinates present, but never actually confirmed.
//   - Discovery's own self-rated confidence (payload.warnings titled
//     "Confidence: Low/Medium") was the single most common warning in the
//     live queue — over a quarter of all pending rows — and didn't touch
//     any circle at all, because its title/body never mentions a specific
//     field. That's a different kind of signal (trust in the row as a
//     whole) than the other six (is this one field present), so it renders
//     as a small badge next to the target instead of competing for a
//     circle of its own.
//
// 2026-08-19 (later same day) — two follow-ups from review:
//   1. The badge was only ever shown for 'low'/'medium' — a reviewer had no
//      way to tell "high confidence" apart from "no confidence data at
//      all" (both rendered as no badge). Discovery's own confidence is now
//      carried on every payload unconditionally (see migrateResearchFindings
//      .ts), so the badge always shows when that data exists, 'high'
//      included — see getConfidenceFlag.
//   2. Neither the circles nor the badge explained themselves anywhere in
//      the UI — the only affordance was a native `title` tooltip on the
//      whole target, which isn't discoverable (nothing hints it's
//      hoverable) and doesn't work on touch at all. Added `IndicatorKey`
//      below: a static, always-visible legend rendered once at the bottom
//      of the review page, not per-row.
import type { ImageEntry } from '@/components/admin/SiteForm';
import type { LinkEntry, CelebrationEntry } from '@/lib/types';

export interface DisplayWarningLike {
  title: string;
  body: string;
}

export type TargetStatus = 'hit' | 'miss' | 'flagged';

export interface TargetCheckInput {
  nativeName: string;
  links: LinkEntry[];
  celebrations: CelebrationEntry[];
  images: ImageEntry[];
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  warnings: DisplayWarningLike[];
  /** Discovery's raw self-rating for this row ('low' | 'medium' | 'high'),
   *  carried unconditionally on payload.confidence since 2026-08-19. Rows
   *  queued before that only have it recoverable via the legacy
   *  "Confidence: Low/Medium" warning (see getConfidenceFlag) — and never
   *  for 'high', which didn't generate a warning either way. */
  confidence?: string | null;
  confidenceReason?: string | null;
}

interface TargetCheck {
  label: string;
  status: (r: TargetCheckInput) => TargetStatus;
}

function hasWarningLike(input: TargetCheckInput, keyword: RegExp): boolean {
  return input.warnings.some((w) => keyword.test(w.title) || keyword.test(w.body));
}

/** A plain "is this field present" check, upgraded to 'flagged' when a
 *  research warning specifically calls that field out (e.g. present, but
 *  Discovery's own confidence_reason or a mismatch note questions it). */
function fieldCheck(label: string, keyword: RegExp, present: (r: TargetCheckInput) => boolean): TargetCheck {
  return {
    label,
    status: (r) => {
      if (!present(r)) return 'miss';
      return hasWarningLike(r, keyword) ? 'flagged' : 'hit';
    },
  };
}

// Coordinates / municipality / country / region warnings all come from the
// same geocode+dedupe block in migrateResearchFindings.ts — grouped under
// one "Location" circle rather than split across several, since a reviewer
// cares whether the place is right, not which specific geocode tier said so.
const LOCATION_WARNING_KEYWORD = /coordinates|municipality mismatch|country mismatch|^region$/i;

const LOCATION_CHECK: TargetCheck = {
  label: 'Location',
  status: (r) => {
    const hasCoords = !!r.latitude.trim() && !!r.longitude.trim();
    if (!hasCoords) return 'miss';
    if (hasWarningLike(r, LOCATION_WARNING_KEYWORD)) return 'flagged';
    // Coordinates exist but were never confirmed against a real Google
    // Places match (no query_place_id — see buildMapsSearchUrl in
    // lib/places.ts). The pipeline doesn't raise a distinct warning for
    // this today, so check the URL shape directly instead of only relying
    // on payload.warnings.
    if (r.googleMapsUrl && !/query_place_id/.test(r.googleMapsUrl)) return 'flagged';
    return 'hit';
  },
};

// The original five research-richness checks (native name, source link,
// Wikipedia link, celebration) with "street address" swapped for "photo" —
// street_address never made it into the pending_submissions payload shape
// (it's consumed upstream for geocoding), while a missing photo is exactly
// the kind of research gap this indicator exists to surface. Location is
// appended as a 6th, distinct concern (publishability, not richness).
export const TARGET_CHECKS: TargetCheck[] = [
  fieldCheck('Native name', /native name/i, (r) => !!r.nativeName.trim()),
  fieldCheck('Photo', /photo|image/i, (r) => r.images.some((img) => !img.removed)),
  fieldCheck('Source link', /source link/i, (r) => r.links.length > 0),
  fieldCheck('Wikipedia link', /wikipedia/i, (r) => r.links.some((l) => l.link_type === 'Wikipedia')),
  fieldCheck('Celebration', /celebration/i, (r) => r.celebrations.length > 0),
  LOCATION_CHECK,
];

const STATUS_COLOR: Record<TargetStatus, string> = {
  hit: '#16a34a', // green — researched
  miss: '#dc2626', // red — incomplete
  flagged: '#d97706', // amber/yellow — present, but a warning called it out
};

const STATUS_LABEL: Record<TargetStatus, string> = {
  hit: 'found',
  miss: 'missing',
  flagged: 'flagged',
};

export interface ConfidenceFlag {
  level: 'low' | 'medium' | 'high';
  reason: string;
}

const CONFIDENCE_BADGE_CLASS: Record<ConfidenceFlag['level'], string> = {
  low: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-green-100 text-green-800',
};

/** Discovery's self-rated confidence isn't a missing-field gap — it's a
 *  trust signal about the row as a whole (the most common warning in the
 *  live queue, ~27% of pending rows) — so it's surfaced as its own badge
 *  rather than trying to force it onto one of the six circles.
 *
 *  Reads payload.confidence/confidence_reason directly (carried on every
 *  row since 2026-08-19) so 'high' rows show a badge too — 'high' never
 *  generated a "Confidence: High" warning even before that, so it could
 *  never be recovered from `warnings` alone. Rows queued before that date
 *  have no payload.confidence at all; for those, fall back to the legacy
 *  "Confidence: Low/Medium" warning text (never present for 'high' rows,
 *  which simply show no badge — there's nothing to recover it from). */
export function getConfidenceFlag(input: Pick<TargetCheckInput, 'confidence' | 'confidenceReason' | 'warnings'>): ConfidenceFlag | null {
  const level = input.confidence?.toLowerCase();
  if (level === 'low' || level === 'medium' || level === 'high') {
    return { level, reason: input.confidenceReason || '(no reason given)' };
  }
  for (const w of input.warnings) {
    const m = /^Confidence:\s*(Low|Medium)$/i.exec(w.title);
    if (m) return { level: m[1].toLowerCase() as 'low' | 'medium', reason: w.body };
  }
  return null;
}

/**
 * Biathlon-target completeness indicator: six small circles in a row, one
 * per research/publishability check, each lit red/yellow/green, plus an
 * optional confidence badge above them. Replaces the old single
 * CompletenessRing (percent-filled ring) with per-field detail at a glance.
 */
export function ResearchTarget({ input, size = 'sm' }: { input: TargetCheckInput; size?: 'sm' | 'md' }) {
  const statuses = TARGET_CHECKS.map((check) => ({ check, status: check.status(input) }));
  const hitCount = statuses.filter((s) => s.status === 'hit').length;
  const confidence = getConfidenceFlag(input);
  const dim = size === 'sm' ? 10 : 14;
  const ringDim = dim + 4;
  const gap = size === 'sm' ? 3 : 4;

  const title = [
    ...(confidence ? [`Confidence: ${confidence.level} — ${confidence.reason}`] : []),
    ...statuses.map(({ check, status }) => `${check.label}: ${STATUS_LABEL[status]}`),
  ].join('\n');

  return (
    <div className="flex flex-col items-end gap-1 shrink-0" title={title}>
      {confidence && (
        <span
          className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap ${CONFIDENCE_BADGE_CLASS[confidence.level]}`}
        >
          {confidence.level} confidence
        </span>
      )}
      <div className="flex items-center" style={{ gap }}>
        {statuses.map(({ check, status }) => (
          <span
            key={check.label}
            aria-label={`${check.label}: ${STATUS_LABEL[status]}`}
            className="rounded-full flex items-center justify-center"
            style={{
              width: ringDim,
              height: ringDim,
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: dim,
                height: dim,
                backgroundColor: STATUS_COLOR[status],
              }}
            />
          </span>
        ))}
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5">{hitCount}/{TARGET_CHECKS.length}</span>
    </div>
  );
}

/**
 * Static legend for the target's circles + confidence badge, rendered once
 * at the bottom of the review page rather than per-card — a reviewer only
 * needs to learn the color coding once. The circle-label list is derived
 * from TARGET_CHECKS so it can't drift out of sync with the actual checks.
 */
export function IndicatorKey() {
  const dotClass = 'inline-block rounded-full shrink-0';
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 text-[13px] text-gray-700">
      <p className="text-sm font-semibold text-navy-700 mb-2">Indicator key</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className={dotClass} style={{ width: 10, height: 10, backgroundColor: STATUS_COLOR.hit }} />
          <span>Green — field researched and present</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={dotClass} style={{ width: 10, height: 10, backgroundColor: STATUS_COLOR.miss }} />
          <span>Red — field missing / incomplete</span>
        </div>
        <div className="flex items-start gap-2">
          <span className={`${dotClass} mt-1`} style={{ width: 10, height: 10, backgroundColor: STATUS_COLOR.flagged }} />
          <span>
            Yellow — present, but called out in this row&apos;s warnings (or, for Location, coordinates
            that were never confirmed against a real place)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${CONFIDENCE_BADGE_CLASS.medium}`}>
            medium
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${CONFIDENCE_BADGE_CLASS.low}`}>
            low
          </span>
          <span>Confidence badge — Discovery&apos;s own self-rating for this row (always shown)</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {TARGET_CHECKS.length} circles = {TARGET_CHECKS.map((c) => c.label).join(' · ')}.
        </p>
      </div>
    </div>
  );
}
