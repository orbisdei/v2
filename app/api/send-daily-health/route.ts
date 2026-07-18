import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSitesWithoutPhotos, getHealthProbeTargets } from '@/lib/data';
import { getSearchHealthSummary, type SearchHealthSummary, type GscAnalyticsRow } from '@/lib/gsc';
import { getCruxSummary, type CruxSummary, type CruxRating } from '@/lib/crux';

// Sequential TTFB probes + 5 GSC calls need headroom beyond the 10s default.
export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = 'https://orbisdei.org';

const NAVY = '#1e1e5f';
const GOLD = '#c9950c';
const GREEN = '#639922';
const AMBER = '#854f0b';
const RED = '#b91c1c';

const INTEREST_LABEL: Record<string, string> = {
  global: '🌍 Global',
  regional: '📍 Regional',
  local: '🏘 Local',
  personal: '👤 Personal',
};

// ---- Speed probes ----

interface ProbeResult {
  label: string;
  url: string;
  status: number | null;
  ttfbMs: number | null;
  totalMs: number | null;
  error?: string;
}

// fetch() resolves once response headers arrive, so time-to-resolve ≈ TTFB.
async function probe(label: string, url: string): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    const ttfbMs = Math.round(performance.now() - start);
    await res.arrayBuffer();
    const totalMs = Math.round(performance.now() - start);
    return { label, url, status: res.status, ttfbMs, totalMs };
  } catch (err) {
    return { label, url, status: null, ttfbMs: null, totalMs: null, error: String(err) };
  }
}

async function runProbes(): Promise<ProbeResult[]> {
  const { siteId, tagId } = await getHealthProbeTargets();
  const targets: [string, string][] = [['Homepage', `${BASE_URL}/`]];
  if (siteId) targets.push(['Site page', `${BASE_URL}/site/${siteId}`]);
  if (tagId) targets.push(['Tag page', `${BASE_URL}/tag/${tagId}`]);
  targets.push(['Search page', `${BASE_URL}/search`]);

  // Sequential so probes don't contend with each other for bandwidth.
  const results: ProbeResult[] = [];
  for (const [label, url] of targets) {
    results.push(await probe(label, url));
  }
  return results;
}

// ---- HTML helpers ----

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-US');
const pct = (n: number | null | undefined) => `${((n ?? 0) * 100).toFixed(1)}%`;

function deltaBadge(cur: number, prev: number | null | undefined): string {
  if (prev == null || prev === 0) return '';
  const d = ((cur - prev) / prev) * 100;
  const color = d >= 0 ? GREEN : RED;
  return ` <span style="color:${color};font-size:12px;">(${d >= 0 ? '+' : ''}${d.toFixed(0)}%)</span>`;
}

function sectionHeading(text: string): string {
  return `<h3 style="color:${NAVY};font-family:Georgia,serif;margin:28px 0 8px;border-bottom:2px solid ${GOLD};padding-bottom:4px;">${text}</h3>`;
}

const TH = `padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#999;letter-spacing:.05em;background:#f5f5f5;`;
const TD = `padding:6px 10px;border-bottom:1px solid #eee;`;

function statsTable(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th style="${TH}">${h}</th>`).join('');
  const body = rows
    .map((cells) => `<tr>${cells.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shortUrl(url: string): string {
  return url.replace(/^https:\/\/(www\.)?orbisdei\.org/, '') || '/';
}

// ---- Email sections ----

function searchSection(gsc: SearchHealthSummary | null, gscError: string | null): string {
  if (gscError) {
    return `${sectionHeading('Search — Google')}<p style="color:${RED};font-size:13px;font-family:sans-serif;">Search Console fetch failed: ${escapeHtml(gscError)}</p>`;
  }
  if (!gsc) {
    return `${sectionHeading('Search — Google')}<p style="color:#888;font-size:13px;font-family:sans-serif;">GSC_CREDENTIALS not configured — search data unavailable.</p>`;
  }

  const l = gsc.latest;
  const latestLine = l
    ? `<p style="font-family:sans-serif;font-size:14px;margin:6px 0;">
        <strong>${gsc.latestDate}</strong> (latest available, ~3-day lag):
        ${num(l.clicks)} clicks${deltaBadge(l.clicks, gsc.previous?.clicks)} ·
        ${num(l.impressions)} impressions${deltaBadge(l.impressions, gsc.previous?.impressions)}
        <span style="color:#888;font-size:12px;">— 7-day daily avg: ${gsc.weekAvg ? `${gsc.weekAvg.clicks.toFixed(1)} clicks / ${gsc.weekAvg.impressions.toFixed(0)} impr` : '—'}</span>
      </p>`
    : `<p style="color:#888;font-size:13px;font-family:sans-serif;">No search data for the latest window yet.</p>`;

  const w = gsc.week;
  const weekLine = w
    ? `<p style="font-family:sans-serif;font-size:13px;color:#555;margin:2px 0 10px;">
        Last 7 days (${w.start} → ${w.end}): ${num(w.clicks)} clicks · ${num(w.impressions)} impressions · CTR ${pct(w.ctr)} · avg position ${w.position.toFixed(1)}
      </p>`
    : '';

  const rowCells = (r: GscAnalyticsRow, key: string) => [
    escapeHtml(key),
    num(r.clicks),
    num(r.impressions),
    r.position.toFixed(1),
  ];
  const queries = gsc.topQueries.length
    ? `<p style="font-family:sans-serif;font-size:13px;font-weight:600;color:${NAVY};margin:12px 0 4px;">Top queries (7d)</p>` +
      statsTable(['Query', 'Clicks', 'Impr', 'Pos'], gsc.topQueries.map((r) => rowCells(r, r.keys?.[0] ?? '')))
    : '';
  const pages = gsc.topPages.length
    ? `<p style="font-family:sans-serif;font-size:13px;font-weight:600;color:${NAVY};margin:12px 0 4px;">Top pages (7d)</p>` +
      statsTable(['Page', 'Clicks', 'Impr', 'Pos'], gsc.topPages.map((r) => rowCells(r, shortUrl(r.keys?.[0] ?? ''))))
    : '';

  const sitemapLines = gsc.sitemaps.length
    ? gsc.sitemaps
        .map((m) => {
          const problems = m.errors + m.warnings > 0;
          return `<p style="font-family:sans-serif;font-size:12px;color:${problems ? AMBER : '#888'};margin:2px 0;">
            ${escapeHtml(shortUrl(m.path))} — ${m.errors} errors, ${m.warnings} warnings${m.lastDownloaded ? ` · last read ${m.lastDownloaded.slice(0, 10)}` : ''}
          </p>`;
        })
        .join('')
    : `<p style="font-family:sans-serif;font-size:12px;color:${AMBER};margin:2px 0;">No sitemaps submitted.</p>`;

  return `${sectionHeading('Search — Google')}${latestLine}${weekLine}${queries}${pages}
    <p style="font-family:sans-serif;font-size:13px;font-weight:600;color:${NAVY};margin:12px 0 2px;">Sitemaps</p>${sitemapLines}`;
}

function cruxBlock(crux: CruxSummary | null, cruxError: string | null): string {
  const note = (text: string, color = '#888') =>
    `<p style="font-family:sans-serif;font-size:12px;color:${color};margin:10px 0 0;">${text}</p>`;
  if (cruxError) return note(`CrUX fetch failed: ${escapeHtml(cruxError)}`, RED);
  if (!crux || crux.status === 'no-key') return note('CRUX_API_KEY not configured — real-user Core Web Vitals unavailable.');
  if (crux.status === 'no-data') return note('Origin not yet in the CrUX dataset (needs more Chrome traffic) — showing probes only.');

  const RATING_COLOR: Record<CruxRating, string> = { good: GREEN, 'needs-improvement': AMBER, poor: RED };
  const rows = crux.metrics.map((m) => [
    `<strong>${m.label}</strong>`,
    `<strong style="color:${RATING_COLOR[m.rating]};">${m.display}</strong>`,
    m.rating.replace('-', ' '),
    m.goodShare != null ? `${(m.goodShare * 100).toFixed(0)}% good` : '—',
  ]);
  return `<p style="font-family:sans-serif;font-size:13px;font-weight:600;color:${NAVY};margin:14px 0 4px;">Real-user Core Web Vitals — CrUX p75${crux.collectionPeriod ? ` <span style="font-weight:400;color:#999;font-size:11px;">(${crux.collectionPeriod})</span>` : ''}</p>
    ${statsTable(['Metric', 'p75', 'Rating', 'Good loads'], rows)}`;
}

function speedSection(probes: ProbeResult[]): string {
  const ttfbCell = (ms: number | null) => {
    if (ms == null) return `<span style="color:${RED};">failed</span>`;
    const color = ms < 800 ? GREEN : ms < 1800 ? AMBER : RED;
    return `<strong style="color:${color};">${num(ms)} ms</strong>`;
  };
  const rows = probes.map((p) => [
    `<a href="${p.url}" style="color:${NAVY};text-decoration:none;">${p.label}</a>`,
    p.error ? `<span style="color:${RED};">—</span>` : String(p.status),
    ttfbCell(p.ttfbMs),
    p.totalMs != null ? `${num(p.totalMs)} ms` : '—',
  ]);
  return `${sectionHeading('Speed')}
    ${statsTable(['Page', 'Status', 'TTFB', 'Total'], rows)}
    <p style="font-family:sans-serif;font-size:11px;color:#999;margin:6px 0 0;">TTFB measured from the Vercel cron function. Green &lt; 800 ms, amber &lt; 1800 ms.</p>`;
}

function photosSection(sites: { id: string; name: string; interest: string | null }[]): string {
  if (sites.length === 0) {
    return `${sectionHeading('Content — sites without photos')}<p style="color:${GREEN};font-size:13px;font-family:sans-serif;">All sites have photos 🎉</p>`;
  }
  const cronSecret = process.env.CRON_SECRET!;
  const rows = sites.map((s) => {
    const label = INTEREST_LABEL[s.interest ?? 'local'] ?? s.interest ?? '—';
    const markUrl = `${BASE_URL}/api/mark-no-image?id=${encodeURIComponent(s.id)}&secret=${encodeURIComponent(cronSecret)}`;
    return [
      `<a href="${BASE_URL}/site/${s.id}" style="color:${NAVY};text-decoration:none;font-weight:500;">${s.id}</a>
       <div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(s.name)}</div>`,
      `<span style="font-size:12px;color:#888;">${label}</span>`,
      `<span style="white-space:nowrap;">
        <a href="${BASE_URL}/site/${s.id}/edit" style="display:inline-block;padding:3px 10px;background:${NAVY};color:#fff;font-size:12px;text-decoration:none;border-radius:4px;margin-right:8px;">Edit</a>
        <a href="${markUrl}" style="color:${GOLD};font-size:12px;text-decoration:none;">Mark no image</a>
      </span>`,
    ];
  });
  return `${sectionHeading(`Content — ${sites.length} site${sites.length !== 1 ? 's' : ''} without photos`)}
    ${statsTable(['Site', 'Interest', 'Action'], rows)}`;
}

// ---- Route ----

export async function GET(req: NextRequest) {
  // Vercel Cron authenticates with "Authorization: Bearer ${CRON_SECRET}"
  // automatically when the CRON_SECRET env var is set. Query-param /
  // x-cron-secret forms are kept for manual runs.
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Each section degrades independently — a GSC outage must not stop the email.
  let gsc: SearchHealthSummary | null = null;
  let gscError: string | null = null;
  let crux: CruxSummary | null = null;
  let cruxError: string | null = null;
  const [gscSettled, probesSettled, photosSettled, cruxSettled] = await Promise.allSettled([
    getSearchHealthSummary(),
    runProbes(),
    getSitesWithoutPhotos(),
    getCruxSummary(),
  ]);
  if (gscSettled.status === 'fulfilled') gsc = gscSettled.value;
  else gscError = String(gscSettled.reason);
  if (cruxSettled.status === 'fulfilled') crux = cruxSettled.value;
  else cruxError = String(cruxSettled.reason);
  const probes = probesSettled.status === 'fulfilled' ? probesSettled.value : [];
  const photoSites = photosSettled.status === 'fulfilled' ? photosSettled.value : [];

  const html = `
    <div style="font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:24px;">
      <h2 style="color:${NAVY};margin-bottom:4px;">Orbis Dei — Daily Health</h2>
      <p style="color:#888;font-size:13px;margin-top:0;">${new Date().toDateString()}</p>
      ${searchSection(gsc, gscError)}
      ${speedSection(probes)}
      ${cruxBlock(crux, cruxError)}
      ${photosSection(photoSites)}
    </div>`;

  const worstTtfb = Math.max(...probes.map((p) => p.ttfbMs ?? 0), 0);
  const subjectParts = [
    gsc?.latest ? `${num(gsc.latest.clicks)} clicks` : null,
    probes.length ? `TTFB ${num(worstTtfb)}ms` : null,
    photoSites.length ? `${photoSites.length} sans photo` : null,
  ].filter(Boolean);
  const subject = `Orbis Dei health — ${subjectParts.join(' · ') || new Date().toDateString()}`;

  const { error } = await resend.emails.send({
    from: 'Orbis Dei <digest@orbisdei.org>',
    to: process.env.DIGEST_EMAIL_TO!,
    subject,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  }

  return NextResponse.json({
    sent: true,
    search: gscError ?? (gsc ? 'ok' : 'no credentials'),
    crux: cruxError ?? crux?.status ?? 'unknown',
    probes: probes.map((p) => ({ label: p.label, ttfbMs: p.ttfbMs, status: p.status })),
    sitesWithoutPhotos: photoSites.length,
  });
}
