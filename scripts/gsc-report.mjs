#!/usr/bin/env node
// ============================================================
// Google Search Console reporting CLI (zero dependencies).
//
// Usage:
//   node scripts/gsc-report.mjs                     28-day summary: totals vs
//                                                   previous period, top queries,
//                                                   top pages, countries, sitemaps
//   node scripts/gsc-report.mjs queries [days]      top 25 queries
//   node scripts/gsc-report.mjs pages [days]        top 25 pages
//   node scripts/gsc-report.mjs inspect <url>       URL Inspection (index status,
//                                                   last crawl, canonical)
//   node scripts/gsc-report.mjs sitemaps            sitemap submission status
//
// Credentials (service account JSON key, in this order):
//   1. GSC_CREDENTIALS_FILE env var — path to the key file
//   2. ./gsc-credentials.json in the repo root (gitignored)
// The service account's client_email must be added as a user on the
// Search Console property (Settings → Users and permissions).
//
// Property defaults to sc-domain:orbisdei.org; override with GSC_PROPERTY.
// Note: search analytics data lags ~3 days, so ranges end 3 days ago.
// ============================================================

import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const PROPERTY = process.env.GSC_PROPERTY ?? 'sc-domain:orbisdei.org';
const API = 'https://searchconsole.googleapis.com';
const ANALYTICS_LAG_DAYS = 3;

// ---- Credentials ----

function loadCredentials() {
  const path = process.env.GSC_CREDENTIALS_FILE ?? 'gsc-credentials.json';
  if (!existsSync(path)) {
    console.error(
      `No credentials found. Put the service account JSON key at ./gsc-credentials.json\n` +
      `(gitignored) or point GSC_CREDENTIALS_FILE at it.`
    );
    process.exit(1);
  }
  const creds = JSON.parse(readFileSync(path, 'utf8'));
  if (!creds.client_email || !creds.private_key) {
    console.error(`${path} is not a service account key (missing client_email/private_key).`);
    process.exit(1);
  }
  return creds;
}

// ---- OAuth: service-account JWT → access token ----

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: creds.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(creds.private_key, 'base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Token exchange failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data.access_token;
}

// ---- API helpers ----

let TOKEN = '';

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) {
    if (res.status === 403) {
      const reason = JSON.stringify(data);
      if (reason.includes('SERVICE_DISABLED') || reason.includes('accessNotConfigured')) {
        console.error(
          `403 — the Search Console API is not enabled in the service account's Google Cloud project.\n` +
          `Enable it here, then retry (takes a minute to propagate):\n` +
          `  https://console.cloud.google.com/apis/library/searchconsole.googleapis.com`
        );
      } else {
        console.error(
          `403 Forbidden — the service account is probably not a user on ${PROPERTY}.\n` +
          `Search Console → Settings → Users and permissions → Add user → the key's client_email.`
        );
      }
    }
    console.error(`${method} ${path} → ${res.status}:`, JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

const encProp = encodeURIComponent(PROPERTY);

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function analytics(body) {
  const data = await api('POST', `/webmasters/v3/sites/${encProp}/searchAnalytics/query`, body);
  return data.rows ?? [];
}

// ---- Formatting ----

const num = (n) => (n ?? 0).toLocaleString('en-US');
const pct = (n) => `${((n ?? 0) * 100).toFixed(1)}%`;
const pos = (n) => (n ?? 0).toFixed(1);

function delta(cur, prev) {
  if (!prev) return '';
  const d = ((cur - prev) / prev) * 100;
  return ` (${d >= 0 ? '+' : ''}${d.toFixed(0)}% vs prev)`;
}

function table(rows, cols) {
  const widths = cols.map((c) => Math.max(c.label.length, ...rows.map((r) => String(c.get(r)).length)));
  console.log('  ' + cols.map((c, i) => c.label.padEnd(widths[i])).join('  '));
  console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) {
    console.log('  ' + cols.map((c, i) => {
      const v = String(c.get(r));
      return c.right ? v.padStart(widths[i]) : v.padEnd(widths[i]);
    }).join('  '));
  }
}

function shortUrl(url) {
  return url.replace(/^https:\/\/(www\.)?orbisdei\.org/, '') || '/';
}

// ---- Commands ----

async function cmdSummary() {
  const end = daysAgo(ANALYTICS_LAG_DAYS);
  const start = daysAgo(ANALYTICS_LAG_DAYS + 27);
  const prevEnd = daysAgo(ANALYTICS_LAG_DAYS + 28);
  const prevStart = daysAgo(ANALYTICS_LAG_DAYS + 55);

  const [totals, prevTotals, queries, pages, countries, sitemaps] = await Promise.all([
    analytics({ startDate: start, endDate: end }),
    analytics({ startDate: prevStart, endDate: prevEnd }),
    analytics({ startDate: start, endDate: end, dimensions: ['query'], rowLimit: 10 }),
    analytics({ startDate: start, endDate: end, dimensions: ['page'], rowLimit: 10 }),
    analytics({ startDate: start, endDate: end, dimensions: ['country'], rowLimit: 5 }),
    api('GET', `/webmasters/v3/sites/${encProp}/sitemaps`),
  ]);

  const t = totals[0] ?? {};
  const p = prevTotals[0] ?? {};

  console.log(`\nSearch performance — ${PROPERTY}, ${start} → ${end} (28 days)\n`);
  console.log(`  Clicks:       ${num(t.clicks)}${delta(t.clicks, p.clicks)}`);
  console.log(`  Impressions:  ${num(t.impressions)}${delta(t.impressions, p.impressions)}`);
  console.log(`  CTR:          ${pct(t.ctr)}`);
  console.log(`  Avg position: ${pos(t.position)}`);

  if (queries.length) {
    console.log('\nTop queries:\n');
    table(queries, [
      { label: 'Query', get: (r) => r.keys[0] },
      { label: 'Clicks', get: (r) => num(r.clicks), right: true },
      { label: 'Impr', get: (r) => num(r.impressions), right: true },
      { label: 'CTR', get: (r) => pct(r.ctr), right: true },
      { label: 'Pos', get: (r) => pos(r.position), right: true },
    ]);
  }

  if (pages.length) {
    console.log('\nTop pages:\n');
    table(pages, [
      { label: 'Page', get: (r) => shortUrl(r.keys[0]) },
      { label: 'Clicks', get: (r) => num(r.clicks), right: true },
      { label: 'Impr', get: (r) => num(r.impressions), right: true },
      { label: 'CTR', get: (r) => pct(r.ctr), right: true },
      { label: 'Pos', get: (r) => pos(r.position), right: true },
    ]);
  }

  if (countries.length) {
    console.log('\nTop countries:\n');
    table(countries, [
      { label: 'Country', get: (r) => r.keys[0].toUpperCase() },
      { label: 'Clicks', get: (r) => num(r.clicks), right: true },
      { label: 'Impr', get: (r) => num(r.impressions), right: true },
    ]);
  }

  printSitemaps(sitemaps);
}

function printSitemaps(data) {
  const maps = data.sitemap ?? [];
  console.log('\nSitemaps:\n');
  if (!maps.length) {
    console.log('  (none submitted — submit https://orbisdei.org/sitemap.xml in Search Console)');
    return;
  }
  for (const m of maps) {
    const contents = (m.contents ?? [])
      .map((c) => `${num(c.submitted)} ${c.type} submitted`)
      .join(', ');
    console.log(`  ${m.path}`);
    console.log(`    last downloaded: ${m.lastDownloaded ?? 'never'}  errors: ${m.errors ?? 0}  warnings: ${m.warnings ?? 0}`);
    if (contents) console.log(`    ${contents}`);
  }
}

async function cmdTop(dimension, days) {
  const end = daysAgo(ANALYTICS_LAG_DAYS);
  const start = daysAgo(ANALYTICS_LAG_DAYS + days - 1);
  const rows = await analytics({ startDate: start, endDate: end, dimensions: [dimension], rowLimit: 25 });
  console.log(`\nTop ${dimension === 'query' ? 'queries' : 'pages'} — ${start} → ${end}\n`);
  table(rows, [
    { label: dimension === 'query' ? 'Query' : 'Page', get: (r) => dimension === 'page' ? shortUrl(r.keys[0]) : r.keys[0] },
    { label: 'Clicks', get: (r) => num(r.clicks), right: true },
    { label: 'Impr', get: (r) => num(r.impressions), right: true },
    { label: 'CTR', get: (r) => pct(r.ctr), right: true },
    { label: 'Pos', get: (r) => pos(r.position), right: true },
  ]);
}

async function cmdInspect(url) {
  if (!url) {
    console.error('Usage: node scripts/gsc-report.mjs inspect <full-url>');
    process.exit(1);
  }
  const data = await api('POST', '/v1/urlInspection/index:inspect', {
    inspectionUrl: url,
    siteUrl: PROPERTY,
  });
  const r = data.inspectionResult?.indexStatusResult ?? {};
  console.log(`\nURL inspection — ${url}\n`);
  console.log(`  Verdict:        ${r.verdict ?? '—'}`);
  console.log(`  Coverage:       ${r.coverageState ?? '—'}`);
  console.log(`  Indexing:       ${r.indexingState ?? '—'}`);
  console.log(`  Robots.txt:     ${r.robotsTxtState ?? '—'}`);
  console.log(`  Fetch:          ${r.pageFetchState ?? '—'}`);
  console.log(`  Last crawl:     ${r.lastCrawlTime ?? 'never'}`);
  console.log(`  User canonical: ${r.userCanonical ?? '—'}`);
  console.log(`  Google canonical: ${r.googleCanonical ?? '—'}`);
  if (r.referringUrls?.length) {
    console.log(`  Referring URLs:`);
    for (const u of r.referringUrls.slice(0, 5)) console.log(`    ${u}`);
  }
}

// ---- Main ----

const [cmd, arg] = process.argv.slice(2);

TOKEN = await getAccessToken(loadCredentials());

switch (cmd) {
  case undefined:
  case 'summary':
    await cmdSummary();
    break;
  case 'queries':
    await cmdTop('query', Number(arg) || 28);
    break;
  case 'pages':
    await cmdTop('page', Number(arg) || 28);
    break;
  case 'inspect':
    await cmdInspect(arg);
    break;
  case 'sitemaps':
    printSitemaps(await api('GET', `/webmasters/v3/sites/${encProp}/sitemaps`));
    break;
  default:
    console.error(`Unknown command: ${cmd}. Use summary | queries | pages | inspect <url> | sitemaps`);
    process.exit(1);
}
console.log();
