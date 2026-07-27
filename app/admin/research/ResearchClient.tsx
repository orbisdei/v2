'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Check,
  X,
  Pencil,
  RefreshCw,
  WifiOff,
  Wifi,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface SourceLink {
  url: string;
  link_type: string;
}

export interface ResearchFindingRow {
  id: string;
  name: string;
  native_name: string | null;
  description: string | null;
  country: string | null;
  municipality: string | null;
  street_address: string | null;
  interest: string | null;
  tags: string[] | null;
  existing_site_name: string | null;
  current_short_description: string | null;
  change_summary: string | null;
  source_links: SourceLink[] | null;
  celebrations: { date_label: string; description: string }[] | null;
  wikipedia_image_url: string | null;
  wikipedia_image_url_override: string | null;
  google_maps_url_override: string | null;
  site_type: string | null;
  status: string;
  confidence: string | null;
  confidence_reason: string | null;
  exclusion_reason: string | null;
  run_topic: string | null;
  run_region: string | null;
  category: string | null;
  reviewed: boolean;
  approved: boolean;
  import_status: string | null;
  site_id: string | null;
  created_at: string;
}

type Patch = Partial<
  Pick<
    ResearchFindingRow,
    | 'status'
    | 'confidence'
    | 'import_status'
    | 'name'
    | 'native_name'
    | 'description'
    | 'country'
    | 'municipality'
    | 'street_address'
    | 'interest'
    | 'site_type'
    | 'google_maps_url_override'
    | 'wikipedia_image_url_override'
  >
>;

interface QueueEntry {
  id: string;
  patch: Patch;
  queuedAt: number;
}

const CACHE_KEY = 'orbisdei-research-backlog-cache-v1';
const QUEUE_KEY = 'orbisdei-research-backlog-queue-v1';

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non-fatal, just skip caching
  }
}

function timestamp(): string {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Shape of runResearchFindingsMigration's JSON result that we actually read
// here — see lib/migrateResearchFindings.ts for the full MigrationResult type.
interface RunResult {
  processed: number;
  created: string[];
  queued: { findingId: string; submissionId: string }[];
  skipped: { id: string; reason: string }[];
  deferred: { id: string; reason: string }[];
  proposedUpdates: { findingId: string; diff: string }[];
  errors: { id: string; message: string }[];
}

/** Turns a single-row-scoped migration result into one human-readable line
 *  for that row — used by both the per-row Confirm and Save-and-Confirm
 *  actions, which share the exact same run call. Candidates are swept into
 *  the admin approval queue rather than created directly (see
 *  lib/migrateResearchFindings.ts v11), hence `queued` rather than `created`. */
function summarizeRunResult(result: RunResult, findingId: string): { ok: boolean; message: string } {
  const err = result.errors.find((e) => e.id === findingId);
  if (err) return { ok: false, message: `Error: ${err.message}` };
  const skip = result.skipped.find((s) => s.id === findingId);
  if (skip) return { ok: true, message: `Skipped — ${skip.reason}` };
  const held = result.deferred.find((d) => d.id === findingId);
  if (held) return { ok: true, message: `Held for review — ${held.reason}` };
  const prop = result.proposedUpdates.find((p) => p.findingId === findingId);
  if (prop) return { ok: true, message: 'Diff generated — apply the change manually on the site.' };
  const queued = result.queued.find((q) => q.findingId === findingId);
  if (queued) return { ok: true, message: 'Queued for approval — review it in Admin → Pending Approvals.' };
  if (result.processed === 0) {
    return { ok: false, message: "Not processed — this row didn't match the pipeline's eligibility gates." };
  }
  return { ok: true, message: 'Processed.' };
}

function reviewBucket(row: ResearchFindingRow): { label: string; color: string; hint?: string } {
  if (row.status === 'excluded') return { label: 'Excluded', color: 'bg-gray-200 text-gray-700' };
  const s = row.import_status ?? '';
  if (/^Ingested/.test(s)) return { label: 'Ingested', color: 'bg-green-100 text-green-800' };
  if (/^Rejected by admin/.test(s)) return { label: 'Rejected', color: 'bg-red-100 text-red-800' };
  if (/^Skipped/.test(s)) return { label: 'Skipped', color: 'bg-orange-100 text-orange-800' };
  if (/^Held for review/.test(s)) return { label: 'Held for review', color: 'bg-orange-100 text-orange-800' };
  if (/^Reviewed/.test(s)) {
    return {
      label: 'Pending manual apply',
      color: 'bg-blue-100 text-blue-800',
      hint: 'The pipeline generated this diff but never applies proposed_modification changes automatically — review it and edit the live site by hand to apply it. Confirming again just re-queues it to regenerate the same diff.',
    };
  }
  if (/^Queued for approval/.test(s)) {
    return {
      label: 'Queued for approval',
      color: 'bg-purple-100 text-purple-800',
      hint: 'Sent to the Pending Approvals queue for full review (tags, links, images, coordinates) — see Admin → Pending Approvals.',
    };
  }
  if (s) return { label: s, color: 'bg-gray-100 text-gray-700' };
  // import_status is null here. confidence === 'high' means it's already
  // queued for the next pipeline run (nothing for a human to do right now) —
  // distinct from a medium/low row that's actually waiting on human review.
  if (row.confidence === 'high') {
    return {
      label: 'Queued for pipeline',
      color: 'bg-indigo-100 text-indigo-800',
      hint: 'High confidence and not yet processed — the next migration run will queue this for admin approval (or regenerate the diff, for a proposed modification).',
    };
  }
  return { label: 'Needs review', color: 'bg-amber-100 text-amber-800' };
}

function pickThumbnail(row: ResearchFindingRow): string | null {
  return row.wikipedia_image_url_override || row.wikipedia_image_url || null;
}

// Completeness = how much of what Discovery is actually capable of finding
// actually got captured on this row. Deliberately excludes fields that are
// closer to "required to consider this row at all" (name, country,
// municipality, interest, site_type, tags) — this is about research richness,
// not eligibility. 100% = every one of these was found; the Montecristi
// Monserrat case (no source links, no celebrations, no image) is exactly the
// shape this is meant to surface early.
const COMPLETENESS_CHECKS: { label: string; test: (row: ResearchFindingRow) => boolean }[] = [
  { label: 'Native name', test: (r) => !!r.native_name },
  { label: 'Street address', test: (r) => !!r.street_address },
  { label: 'Source link', test: (r) => (r.source_links?.length ?? 0) > 0 },
  { label: 'Wikipedia link', test: (r) => !!r.source_links?.some((l) => l.link_type === 'Wikipedia') },
  { label: 'Celebration', test: (r) => (r.celebrations?.length ?? 0) > 0 },
  { label: 'Lead image', test: (r) => !!(r.wikipedia_image_url_override || r.wikipedia_image_url) },
];

function completeness(row: ResearchFindingRow): { pct: number; present: string[]; missing: string[] } {
  const present = COMPLETENESS_CHECKS.filter((c) => c.test(row)).map((c) => c.label);
  const missing = COMPLETENESS_CHECKS.filter((c) => !c.test(row)).map((c) => c.label);
  return { pct: Math.round((present.length / COMPLETENESS_CHECKS.length) * 100), present, missing };
}

function CompletenessRing({ row }: { row: ResearchFindingRow }) {
  const { pct, present, missing } = completeness(row);
  const size = 40;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = pct >= 84 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  const title =
    `${pct}% complete\n` +
    `Found: ${present.length ? present.join(', ') : '(none)'}\n` +
    `Missing: ${missing.length ? missing.join(', ') : '(none)'}`;

  return (
    <div className="flex-shrink-0" title={title}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="#374151">
          {pct}%
        </text>
      </svg>
    </div>
  );
}

export default function ResearchClient({ initialRows }: { initialRows: ResearchFindingRow[] }) {
  const [rows, setRows] = useState<ResearchFindingRow[]>(initialRows);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Default view: the rows that actually need a human decision — medium/low
  // confidence candidates and proposed modifications. High-confidence rows
  // sail through the pipeline unattended; duplicate/excluded rows are done.
  const [statusFilters, setStatusFilters] = useState<Set<string>>(
    () => new Set(['candidate', 'proposed_modification'])
  );
  const [confidenceFilters, setConfidenceFilters] = useState<Set<string>>(() => new Set(['medium', 'low']));
  const [hideResolved, setHideResolved] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [runFeedback, setRunFeedback] = useState<Record<string, { ok: boolean; message: string }>>({});

  const syncingRef = useRef(false);

  // ── Init: load queue from localStorage, apply it on top of the server rows
  // (so a mid-sync page reload still shows the admin's own pending edits),
  // and wire online/offline listeners. ──────────────────────────────────────
  useEffect(() => {
    const storedQueue = readJSON<QueueEntry[]>(QUEUE_KEY, []);
    setQueue(storedQueue);
    if (storedQueue.length > 0) {
      setRows((prev) =>
        prev.map((r) => {
          const q = storedQueue.find((e) => e.id === r.id);
          return q ? { ...r, ...q.patch } : r;
        })
      );
    }
    writeJSON(CACHE_KEY, initialRows);

    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    if (!navigator.onLine) return;
    const current = readJSON<QueueEntry[]>(QUEUE_KEY, []);
    if (current.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    let remaining = [...current];
    for (const entry of current) {
      try {
        const res = await fetch(`/api/admin/research-findings/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.patch),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Sync failed (${res.status})`);
        }
        remaining = remaining.filter((e) => e.id !== entry.id || e.queuedAt !== entry.queuedAt);
        writeJSON(QUEUE_KEY, remaining);
        setQueue(remaining);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed — will retry');
        break; // stop on first failure, keep the rest queued for next attempt
      }
    }

    syncingRef.current = false;
    setSyncing(false);
  }, []);

  // Retry whenever we come back online.
  useEffect(() => {
    if (online) syncQueue();
  }, [online, syncQueue]);

  const queueAndApply = useCallback(
    (id: string, patch: Patch) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

      const current = readJSON<QueueEntry[]>(QUEUE_KEY, []);
      const existingIdx = current.findIndex((e) => e.id === id);
      const merged: QueueEntry = {
        id,
        patch: existingIdx >= 0 ? { ...current[existingIdx].patch, ...patch } : patch,
        queuedAt: Date.now(),
      };
      const next = existingIdx >= 0 ? current.map((e, i) => (i === existingIdx ? merged : e)) : [...current, merged];
      writeJSON(QUEUE_KEY, next);
      setQueue(next);

      if (navigator.onLine) syncQueue();
    },
    [syncQueue]
  );

  const rejectRow = (row: ResearchFindingRow) => {
    if (!window.confirm(`Reject "${row.name}"? It will be excluded from the ingestion pipeline.`)) return;
    queueAndApply(row.id, { status: 'excluded', import_status: `Rejected by admin at ${timestamp()}` });
  };

  const refresh = async () => {
    if (!navigator.onLine) return;
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/research-findings');
      if (!res.ok) throw new Error('Refresh failed');
      const body = await res.json();
      const fresh = (body.rows ?? []) as ResearchFindingRow[];
      const pending = readJSON<QueueEntry[]>(QUEUE_KEY, []);
      setRows(fresh.map((r) => {
        const q = pending.find((e) => e.id === r.id);
        return q ? { ...r, ...q.patch } : r;
      }));
      writeJSON(CACHE_KEY, fresh);
    } catch {
      // stay on whatever's currently shown — likely a connectivity blip
    } finally {
      setRefreshing(false);
    }
  };

  // Confirm — and Save-and-Confirm from the edit form, via extraPatch — both
  // funnel through here: mark the row ready (confidence high, no processing
  // marker), then immediately run it through the SAME migration function the
  // general-sweep cron/admin-panel button uses (runResearchFindingsMigration,
  // scoped via findingIds to just this row). Offline, there's no pipeline to
  // run against, so it degrades to the plain offline-queued patch — the row is
  // marked ready and will need Confirm pressed again (or the next cron tick)
  // once back online.
  const confirmAndRun = useCallback(
    async (row: ResearchFindingRow, extraPatch: Patch = {}) => {
      const readyPatch: Patch = { ...extraPatch, confidence: 'high', import_status: null };

      if (!navigator.onLine) {
        queueAndApply(row.id, readyPatch);
        setRunFeedback((prev) => ({
          ...prev,
          [row.id]: { ok: true, message: 'Offline — marked ready and queued. Press Confirm again once reconnected to actually run it.' },
        }));
        return;
      }

      setRunningIds((prev) => new Set(prev).add(row.id));
      setRunFeedback((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

      try {
        const patchRes = await fetch(`/api/admin/research-findings/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(readyPatch),
        });
        if (!patchRes.ok) {
          const b = await patchRes.json().catch(() => ({}));
          throw new Error(b.error || 'Save failed');
        }
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...readyPatch } : r)));

        const runRes = await fetch('/api/admin/migrate-research-findings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun: false, findingIds: [row.id] }),
        });
        const result = await runRes.json().catch(() => null);
        if (!runRes.ok) throw new Error(result?.error || 'Pipeline run failed');

        setRunFeedback((prev) => ({ ...prev, [row.id]: summarizeRunResult(result as RunResult, row.id) }));
        await refresh();
      } catch (err) {
        setRunFeedback((prev) => ({
          ...prev,
          [row.id]: { ok: false, message: err instanceof Error ? err.message : 'Failed' },
        }));
      } finally {
        setRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [queueAndApply]
  );

  // Confirm and Queue — the alternative to Confirm's direct pipeline run:
  // stages the row as a pending_submissions row (type='site', action='create')
  // in the SAME approval backlog contributor site submissions land in, so
  // tags/links/images/coordinates can all be adjusted there before anything
  // goes live. Unlike Confirm, this never touches confidence/status — it's a
  // separate track, not a pipeline re-queue. Requires a live connection (the
  // route does real geocoding/Wikipedia lookups), so no offline fallback.
  const confirmAndQueue = useCallback(async (row: ResearchFindingRow, extraPatch: Patch = {}) => {
    if (!navigator.onLine) {
      setRunFeedback((prev) => ({
        ...prev,
        [row.id]: { ok: false, message: 'Queuing for approval needs a connection — try again once reconnected.' },
      }));
      return;
    }

    setRunningIds((prev) => new Set(prev).add(row.id));
    setRunFeedback((prev) => {
      const next = { ...prev };
      delete next[row.id];
      return next;
    });

    try {
      if (Object.keys(extraPatch).length > 0) {
        const patchRes = await fetch(`/api/admin/research-findings/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraPatch),
        });
        if (!patchRes.ok) {
          const b = await patchRes.json().catch(() => ({}));
          throw new Error(b.error || 'Save failed');
        }
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...extraPatch } : r)));
      }

      const queueRes = await fetch(`/api/admin/research-findings/${row.id}/queue`, { method: 'POST' });
      const result = await queueRes.json().catch(() => null);
      if (!queueRes.ok) throw new Error(result?.error || 'Queue failed');

      setRunFeedback((prev) => ({
        ...prev,
        [row.id]: { ok: true, message: 'Queued for approval — review it in Admin → Pending Approvals.' },
      }));
      await refresh();
    } catch (err) {
      setRunFeedback((prev) => ({
        ...prev,
        [row.id]: { ok: false, message: err instanceof Error ? err.message : 'Failed' },
      }));
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilters.size > 0 && !statusFilters.has(r.status)) return false;
      // Confidence-less rows (duplicate/excluded) pass through regardless —
      // the confidence filter only ever excludes rows that HAVE a confidence
      // value outside the selected set.
      if (confidenceFilters.size > 0 && r.confidence && !confidenceFilters.has(r.confidence)) return false;
      if (hideResolved) {
        const bucket = reviewBucket(r).label;
        if (bucket === 'Ingested' || bucket === 'Rejected' || bucket === 'Excluded' || bucket === 'Queued for approval') {
          return false;
        }
      }
      if (q) {
        const haystack = [r.name, r.existing_site_name, r.run_topic, r.run_region, r.municipality, r.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilters, confidenceFilters, hideResolved, search]);

  const toggleInSet = (set: Set<string>, setSet: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-navy-700">Research Backlog</h1>
        <button
          onClick={refresh}
          disabled={!online || refreshing}
          className="flex items-center gap-1.5 text-sm text-navy-700 disabled:text-gray-400 min-h-[44px] px-2"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Connectivity / sync status */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        {online ? (
          <span className="flex items-center gap-1 text-green-700">
            <Wifi size={14} /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500">
            <WifiOff size={14} /> Offline — edits will sync when reconnected
          </span>
        )}
        {queue.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {syncing ? 'Syncing…' : `${queue.length} change${queue.length === 1 ? '' : 's'} pending sync`}
          </span>
        )}
        {syncError && <span className="text-red-600">{syncError}</span>}
      </div>

      {/* Filters — each chip toggles independently; "All" is a select-all shortcut */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilters(new Set(['candidate', 'proposed_modification', 'duplicate', 'excluded']))}
            className="px-3 py-1.5 rounded-full text-sm min-h-[36px] bg-white text-gray-700 border border-gray-300"
          >
            All statuses
          </button>
          {(['candidate', 'proposed_modification', 'duplicate', 'excluded'] as const).map((s) => (
            <button
              key={s}
              onClick={() => toggleInSet(statusFilters, setStatusFilters, s)}
              className={`px-3 py-1.5 rounded-full text-sm min-h-[36px] ${
                statusFilters.has(s) ? 'bg-navy-700 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setConfidenceFilters(new Set(['high', 'medium', 'low']))}
            className="px-3 py-1.5 rounded-full text-sm min-h-[36px] bg-white text-gray-700 border border-gray-300"
          >
            All confidence
          </button>
          {(['high', 'medium', 'low'] as const).map((c) => (
            <button
              key={c}
              onClick={() => toggleInSet(confidenceFilters, setConfidenceFilters, c)}
              className={`px-3 py-1.5 rounded-full text-sm min-h-[36px] ${
                confidenceFilters.has(c) ? 'bg-gold-100 text-navy-700' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {c}
            </button>
          ))}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={hideResolved} onChange={(e) => setHideResolved(e.target.checked)} />
            Hide resolved
          </label>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, topic, region…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px]"
        />
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {filteredRows.length} of {rows.length} rows
      </p>

      <div className="space-y-3">
        {filteredRows.map((row) => (
          <FindingCard
            key={row.id}
            row={row}
            expanded={expandedId === row.id}
            onToggleExpand={() => setExpandedId(expandedId === row.id ? null : row.id)}
            onConfirm={() => confirmAndRun(row)}
            onReject={() => rejectRow(row)}
            onSaveEdit={(patch) => queueAndApply(row.id, patch)}
            onSaveAndConfirm={(patch) => confirmAndRun(row, patch)}
            onSaveAndQueue={(patch) => confirmAndQueue(row, patch)}
            running={runningIds.has(row.id)}
            feedback={runFeedback[row.id]}
          />
        ))}
        {filteredRows.length === 0 && (
          <p className="text-center text-gray-500 py-12">No rows match these filters.</p>
        )}
      </div>
    </div>
  );
}

function FindingCard({
  row,
  expanded,
  onToggleExpand,
  onConfirm,
  onReject,
  onSaveEdit,
  onSaveAndConfirm,
  onSaveAndQueue,
  running,
  feedback,
}: {
  row: ResearchFindingRow;
  expanded: boolean;
  onToggleExpand: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onSaveEdit: (patch: Patch) => void;
  onSaveAndConfirm: (patch: Patch) => void;
  onSaveAndQueue: (patch: Patch) => void;
  running: boolean;
  feedback?: { ok: boolean; message: string };
}) {
  const bucket = reviewBucket(row);
  const thumb = pickThumbnail(row);
  const canConfirm = row.status === 'candidate' || row.status === 'proposed_modification';
  const canReject = row.status !== 'excluded';
  const displayName = row.name || row.existing_site_name || '(untitled)';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-3 flex gap-3 items-start">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-16 h-16 object-cover rounded-md flex-shrink-0 bg-gray-100" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <h3 className="font-medium text-navy-700 truncate">{displayName}</h3>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{row.status.replace('_', ' ')}</span>
            {row.confidence && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{row.confidence} confidence</span>
            )}
            <span className={`px-2 py-0.5 rounded-full ${bucket.color}`} title={bucket.hint}>
              {bucket.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">
            {[row.run_topic, row.run_region, row.municipality, row.country].filter(Boolean).join(' • ')}
          </p>
          {row.confidence_reason && row.confidence !== 'high' && (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-2.5 py-1.5 mb-2">
              {row.confidence_reason}
            </p>
          )}
          <p className="text-sm text-gray-700">{row.description || row.current_short_description || ''}</p>
        </div>
        <CompletenessRing row={row} />
      </div>

      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={onConfirm}
          disabled={!canConfirm || running}
          title={
            !canConfirm
              ? 'Only candidate / proposed-modification rows can be confirmed'
              : 'Mark ready and run this row through the pipeline now — candidates go to the admin approval queue, not straight to sites'
          }
          className="flex items-center gap-1 px-3 py-2 rounded-md bg-green-600 text-white text-sm disabled:bg-gray-200 disabled:text-gray-400 min-h-[44px]"
        >
          <Check size={16} /> {running ? 'Running…' : 'Confirm'}
        </button>
        <button
          onClick={onReject}
          disabled={!canReject || running}
          className="flex items-center gap-1 px-3 py-2 rounded-md bg-red-50 text-red-700 text-sm disabled:bg-gray-100 disabled:text-gray-400 min-h-[44px]"
        >
          <X size={16} /> Reject
        </button>
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 text-gray-700 text-sm ml-auto min-h-[44px]"
        >
          <Pencil size={16} /> {expanded ? 'Close' : 'Edit'}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {feedback && (
        <p className={`text-sm px-3 pb-3 ${feedback.ok ? 'text-gray-600' : 'text-red-600'}`}>{feedback.message}</p>
      )}

      {expanded && (
        <EditForm
          row={row}
          onSave={onSaveEdit}
          onSaveAndConfirm={onSaveAndConfirm}
          onSaveAndQueue={onSaveAndQueue}
          onClose={onToggleExpand}
          running={running}
        />
      )}
    </div>
  );
}

function EditForm({
  row,
  onSave,
  onSaveAndConfirm,
  onSaveAndQueue,
  onClose,
  running,
}: {
  row: ResearchFindingRow;
  onSave: (patch: Patch) => void;
  onSaveAndConfirm: (patch: Patch) => void;
  onSaveAndQueue: (patch: Patch) => void;
  onClose: () => void;
  running: boolean;
}) {
  const [name, setName] = useState(row.name ?? '');
  const [description, setDescription] = useState(row.description ?? '');
  const [nativeName, setNativeName] = useState(row.native_name ?? '');
  const [country, setCountry] = useState(row.country ?? '');
  const [municipality, setMunicipality] = useState(row.municipality ?? '');
  const [streetAddress, setStreetAddress] = useState(row.street_address ?? '');
  const [interest, setInterest] = useState(row.interest ?? '');
  const [siteType, setSiteType] = useState(row.site_type ?? '');
  const [mapsOverride, setMapsOverride] = useState(row.google_maps_url_override ?? '');
  const [wikiOverride, setWikiOverride] = useState(row.wikipedia_image_url_override ?? '');

  const computePatch = (): Patch => {
    const patch: Patch = {};
    if (name !== (row.name ?? '')) patch.name = name;
    if (description !== (row.description ?? '')) patch.description = description;
    if (nativeName !== (row.native_name ?? '')) patch.native_name = nativeName || null;
    if (country !== (row.country ?? '')) patch.country = country || null;
    if (municipality !== (row.municipality ?? '')) patch.municipality = municipality || null;
    if (streetAddress !== (row.street_address ?? '')) patch.street_address = streetAddress || null;
    if (interest !== (row.interest ?? '')) patch.interest = interest || null;
    if (siteType !== (row.site_type ?? '')) patch.site_type = siteType || null;
    if (mapsOverride !== (row.google_maps_url_override ?? '')) patch.google_maps_url_override = mapsOverride || null;
    if (wikiOverride !== (row.wikipedia_image_url_override ?? '')) patch.wikipedia_image_url_override = wikiOverride || null;
    return patch;
  };

  const handleSave = () => {
    const patch = computePatch();
    if (Object.keys(patch).length > 0) onSave(patch);
    onClose();
  };

  const handleSaveAndConfirm = () => {
    onSaveAndConfirm(computePatch());
    onClose();
  };

  const handleSaveAndQueue = () => {
    onSaveAndQueue(computePatch());
    onClose();
  };

  return (
    <div className="border-t border-gray-200 p-3 space-y-3 bg-gray-50">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </Field>
      <Field label="Native name">
        <input value={nativeName} onChange={(e) => setNativeName(e.target.value)} className="input" />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Country (2-letter)">
          <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} className="input" />
        </Field>
        <Field label="Municipality">
          <input value={municipality} onChange={(e) => setMunicipality(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="Street address (feeds geocoding at ingestion)">
        <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="input" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest">
          <select value={interest} onChange={(e) => setInterest(e.target.value)} className="input">
            <option value="">(none)</option>
            <option value="global">Global</option>
            <option value="regional">Regional</option>
            <option value="local">Local</option>
            <option value="topical">Topical</option>
          </select>
        </Field>
        <Field label="Site type">
          <select value={siteType} onChange={(e) => setSiteType(e.target.value)} className="input">
            <option value="">(none)</option>
            <option value="active-church">Active church</option>
            <option value="active-community">Active community</option>
            <option value="other-religious">Other religious</option>
            <option value="heritage">Heritage</option>
          </select>
        </Field>
      </div>

      <Field label="Google Maps URL override">
        <input
          value={mapsOverride}
          onChange={(e) => setMapsOverride(e.target.value)}
          placeholder="Leave blank to auto-derive at ingestion"
          className="input"
        />
      </Field>
      {row.google_maps_url_override && (
        <a href={row.google_maps_url_override} target="_blank" rel="noreferrer" className="text-xs text-navy-700 flex items-center gap-1">
          <ExternalLink size={12} /> Open current link
        </a>
      )}

      <Field label="Wikipedia image URL override">
        <input
          value={wikiOverride}
          onChange={(e) => setWikiOverride(e.target.value)}
          placeholder="Leave blank to use the captured Wikipedia image below"
          className="input"
        />
      </Field>
      {row.wikipedia_image_url && (
        <button
          type="button"
          onClick={() => setWikiOverride(row.wikipedia_image_url ?? '')}
          className="flex items-center gap-2"
          title={row.wikipedia_image_url}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.wikipedia_image_url} alt="" className="w-14 h-14 object-cover rounded border border-gray-300" />
          <span className="text-xs text-gray-500 underline">Use captured image</span>
        </button>
      )}

      {row.source_links && row.source_links.length > 0 && (
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-medium">Source links (read-only)</p>
          {row.source_links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-navy-700 underline">
              <ExternalLink size={12} /> {l.link_type}
            </a>
          ))}
        </div>
      )}

      {row.exclusion_reason && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Exclusion reason:</span> {row.exclusion_reason}
        </p>
      )}
      {row.change_summary && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Proposed change:</span> {row.change_summary}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={handleSaveAndConfirm}
          disabled={running}
          className="px-4 py-2 rounded-md bg-navy-700 text-white text-sm disabled:bg-gray-300 min-h-[44px]"
        >
          Confirm
        </button>
        <button
          onClick={handleSaveAndQueue}
          disabled={running}
          title="Save any edits, then send to Admin → Pending Approvals for full review (tags, links, images, coordinates) before it goes live"
          className="px-4 py-2 rounded-md bg-navy-700 text-white text-sm disabled:bg-gray-300 min-h-[44px]"
        >
          Confirm and Queue
        </button>
        <button onClick={handleSave} className="px-4 py-2 rounded-md bg-navy-700 text-white text-sm min-h-[44px]">
          Save
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm min-h-[44px]">
          Cancel
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
