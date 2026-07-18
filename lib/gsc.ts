// Server-only Google Search Console client — powers the daily health email.
// Same service-account JWT auth as scripts/gsc-report.mjs (zero dependencies).
//
// Credentials (service account JSON key), in this order:
//   1. GSC_CREDENTIALS env var — the key JSON as a string (use this on Vercel)
//   2. GSC_CREDENTIALS_FILE env var — path to the key file
//   3. ./gsc-credentials.json in the repo root (gitignored, local runs)
// The service account's client_email must be added as a user on the
// Search Console property. Property defaults to sc-domain:orbisdei.org;
// override with GSC_PROPERTY.

import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const API = 'https://searchconsole.googleapis.com';
const PROPERTY = process.env.GSC_PROPERTY ?? 'sc-domain:orbisdei.org';

// Search analytics data lags ~3 days behind real time.
export const GSC_LAG_DAYS = 3;

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

export interface GscAnalyticsRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSitemapStatus {
  path: string;
  errors: number;
  warnings: number;
  lastDownloaded: string | null;
}

export interface SearchHealthSummary {
  property: string;
  /** Most recent date with data (YYYY-MM-DD, ~3 days ago). */
  latestDate: string | null;
  latest: GscAnalyticsRow | null;
  /** The day before latestDate. */
  previous: GscAnalyticsRow | null;
  /** Daily averages over the 7 days before latestDate. */
  weekAvg: { clicks: number; impressions: number } | null;
  /** Totals for the 7-day window ending on the latest available date. */
  week: (GscAnalyticsRow & { start: string; end: string }) | null;
  topQueries: GscAnalyticsRow[];
  topPages: GscAnalyticsRow[];
  sitemaps: GscSitemapStatus[];
}

function loadCredentials(): ServiceAccountKey | null {
  const raw = process.env.GSC_CREDENTIALS;
  if (raw) return JSON.parse(raw) as ServiceAccountKey;
  const path = process.env.GSC_CREDENTIALS_FILE ?? 'gsc-credentials.json';
  if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as ServiceAccountKey;
  return null;
}

function b64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(creds: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: creds.token_uri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(creds.private_key, 'base64url');

  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GSC token exchange failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function api(token: string, method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) {
    throw new Error(`GSC ${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as Record<string, unknown>;
}

const encProp = encodeURIComponent(PROPERTY);

async function analytics(token: string, body: Record<string, unknown>): Promise<GscAnalyticsRow[]> {
  const data = await api(token, 'POST', `/webmasters/v3/sites/${encProp}/searchAnalytics/query`, body);
  return (data.rows as GscAnalyticsRow[] | undefined) ?? [];
}

/**
 * One-call summary for the daily health email. Returns null when no
 * credentials are configured; throws on API errors (callers should catch
 * and degrade the email section rather than fail the whole send).
 */
export async function getSearchHealthSummary(): Promise<SearchHealthSummary | null> {
  const creds = loadCredentials();
  if (!creds) return null;
  const token = await getAccessToken(creds);

  const end = daysAgo(GSC_LAG_DAYS);
  const weekStart = daysAgo(GSC_LAG_DAYS + 6);

  const [daily, week, topQueries, topPages, sitemapData] = await Promise.all([
    // 8 days of per-date rows: latest day, day before, and a week for averages.
    analytics(token, { startDate: daysAgo(GSC_LAG_DAYS + 7), endDate: end, dimensions: ['date'] }),
    analytics(token, { startDate: weekStart, endDate: end }),
    analytics(token, { startDate: weekStart, endDate: end, dimensions: ['query'], rowLimit: 5 }),
    analytics(token, { startDate: weekStart, endDate: end, dimensions: ['page'], rowLimit: 5 }),
    api(token, 'GET', `/webmasters/v3/sites/${encProp}/sitemaps`),
  ]);

  const byDate = [...daily].sort((a, b) => (a.keys?.[0] ?? '').localeCompare(b.keys?.[0] ?? ''));
  const latest = byDate.at(-1) ?? null;
  const previous = byDate.at(-2) ?? null;
  const earlier = byDate.slice(0, -1);
  const weekAvg = earlier.length
    ? {
        clicks: earlier.reduce((sum, r) => sum + r.clicks, 0) / earlier.length,
        impressions: earlier.reduce((sum, r) => sum + r.impressions, 0) / earlier.length,
      }
    : null;

  const sitemaps = ((sitemapData.sitemap as Record<string, unknown>[] | undefined) ?? []).map((m) => ({
    path: String(m.path ?? ''),
    errors: Number(m.errors ?? 0),
    warnings: Number(m.warnings ?? 0),
    lastDownloaded: (m.lastDownloaded as string | undefined) ?? null,
  }));

  return {
    property: PROPERTY,
    latestDate: latest?.keys?.[0] ?? null,
    latest,
    previous,
    weekAvg,
    week: week[0] ? { ...week[0], start: weekStart, end } : null,
    topQueries,
    topPages,
    sitemaps,
  };
}
