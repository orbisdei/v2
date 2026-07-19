// Server-only Chrome UX Report (CrUX) client — real-user Core Web Vitals
// for the daily health email. Free Google API key in CRUX_API_KEY (create in
// the same Cloud project as the GSC service account; enable "Chrome UX Report
// API" in the API library).
//
// CrUX only includes origins with sufficient Chrome traffic; a 404 from the
// API means orbisdei.org isn't in the dataset yet — reported as 'no-data',
// not an error. Values are p75 over a rolling 28-day window.

const API = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const ORIGIN = 'https://orbisdei.org';

export type CruxRating = 'good' | 'needs-improvement' | 'poor';

export interface CruxMetric {
  /** Metric key as reported by the API, e.g. largest_contentful_paint. */
  name: string;
  label: string;
  /** p75 value — milliseconds for timing metrics, unitless score for CLS. */
  p75: number;
  display: string;
  rating: CruxRating;
  /** Fraction of page loads rated "good" (0–1). */
  goodShare: number | null;
}

export interface CruxSummary {
  status: 'ok' | 'no-key' | 'no-data';
  metrics: CruxMetric[];
  /** e.g. "2026-06-20 → 2026-07-17" */
  collectionPeriod: string | null;
}

// web.dev thresholds: [good ≤, poor >]
const METRIC_DEFS: { key: string; label: string; good: number; poor: number; unit: 'ms' | 'score' }[] = [
  { key: 'largest_contentful_paint', label: 'LCP', good: 2500, poor: 4000, unit: 'ms' },
  { key: 'interaction_to_next_paint', label: 'INP', good: 200, poor: 500, unit: 'ms' },
  { key: 'cumulative_layout_shift', label: 'CLS', good: 0.1, poor: 0.25, unit: 'score' },
  { key: 'experimental_time_to_first_byte', label: 'TTFB', good: 800, poor: 1800, unit: 'ms' },
];

function rate(value: number, good: number, poor: number): CruxRating {
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function fmtDate(d: { year?: number; month?: number; day?: number } | undefined): string | null {
  if (!d?.year) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.year}-${pad(d.month ?? 1)}-${pad(d.day ?? 1)}`;
}

export async function getCruxSummary(): Promise<CruxSummary> {
  const key = process.env.CRUX_API_KEY;
  if (!key) return { status: 'no-key', metrics: [], collectionPeriod: null };

  const res = await fetch(`${API}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: ORIGIN }),
  });
  if (res.status === 404) return { status: 'no-data', metrics: [], collectionPeriod: null };
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`CrUX API → ${res.status}: ${JSON.stringify(data)}`);
  }

  const record = (data.record ?? {}) as {
    metrics?: Record<string, { percentiles?: { p75?: number | string }; histogram?: { density?: number }[] }>;
    collectionPeriod?: { firstDate?: Record<string, number>; lastDate?: Record<string, number> };
  };

  const metrics: CruxMetric[] = [];
  for (const def of METRIC_DEFS) {
    const m = record.metrics?.[def.key];
    const p75raw = m?.percentiles?.p75;
    if (p75raw == null) continue;
    const p75 = Number(p75raw);
    metrics.push({
      name: def.key,
      label: def.label,
      p75,
      display: def.unit === 'ms' ? `${Math.round(p75).toLocaleString('en-US')} ms` : p75.toFixed(2),
      rating: rate(p75, def.good, def.poor),
      goodShare: m?.histogram?.[0]?.density ?? null,
    });
  }

  const first = fmtDate(record.collectionPeriod?.firstDate);
  const last = fmtDate(record.collectionPeriod?.lastDate);

  return {
    status: 'ok',
    metrics,
    collectionPeriod: first && last ? `${first} → ${last}` : null,
  };
}
