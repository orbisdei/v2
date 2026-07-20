#!/usr/bin/env node
// ============================================================
// Daily PageSpeed Insights snapshot (zero dependencies).
//
// Runs Lighthouse (mobile) via the PSI API against key pages and upserts
// the results into the daily_health_snapshots table (kind='psi'), where
// /api/send-daily-health picks them up for the morning email.
//
// Invoked by .github/workflows/psi-daily.yml; run manually with:
//   PSI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/psi-snapshot.mjs
//
// Env:
//   PSI_API_KEY                — Google API key with the PageSpeed Insights
//                                API enabled (the CrUX key works if that API
//                                is added to its restrictions)
//   SUPABASE_URL               — https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — writes bypass RLS (no insert policy exists)
// ============================================================

const BASE_URL = 'https://orbisdei.org';
const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function supabaseGet(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// Same targets as the email's TTFB probes: homepage, one featured site,
// one featured topic tag, search.
async function buildTargets(url, key) {
  const targets = [['Homepage', `${BASE_URL}/`]];
  try {
    const [sites, tags] = await Promise.all([
      supabaseGet(url, key, 'sites?select=id&featured=eq.true&order=name&limit=1'),
      supabaseGet(url, key, 'tags?select=id&featured=eq.true&type=eq.topic&order=name&limit=1'),
    ]);
    if (sites[0]?.id) targets.push(['Site page', `${BASE_URL}/site/${sites[0].id}`]);
    if (tags[0]?.id) targets.push(['Tag page', `${BASE_URL}/tag/${tags[0].id}`]);
  } catch (err) {
    console.warn(`Could not fetch featured targets (continuing with fewer pages): ${err}`);
  }
  targets.push(['Search page', `${BASE_URL}/search`]);
  return targets;
}

// The LCP element audit nests the node a couple of levels deep and the exact
// shape varies, so walk the details tree for the first `type:'node'` object and
// pull out a human-readable selector/snippet. This is what tells us WHICH
// element is the largest-contentful-paint on each page — the number alone can't.
function extractLcpElement(lh) {
  const details = lh.audits?.['largest-contentful-paint-element']?.details;
  if (!details) return null;
  let node = null;
  const visit = (v) => {
    if (node || !v || typeof v !== 'object') return;
    if (v.type === 'node') { node = v; return; }
    for (const val of Array.isArray(v) ? v : Object.values(v)) visit(val);
  };
  visit(details.items ?? details);
  if (!node) return null;
  const clip = (s, n) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : undefined);
  return {
    selector: clip(node.selector, 200),
    snippet: clip(node.snippet, 300),
    nodeLabel: clip(node.nodeLabel, 120),
  };
}

async function runPsi(apiKey, label, url) {
  const psiUrl = `${PSI_API}?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${encodeURIComponent(apiKey)}`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(psiUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(`PSI → ${res.status}: ${JSON.stringify(data.error ?? data).slice(0, 300)}`);
      const lh = data.lighthouseResult ?? {};
      const audit = (id) => lh.audits?.[id]?.numericValue ?? null;
      const score = lh.categories?.performance?.score;
      const lcpElement = extractLcpElement(lh);
      const result = {
        label,
        url,
        score: score != null ? Math.round(score * 100) : null,
        lcpMs: audit('largest-contentful-paint'),
        cls: audit('cumulative-layout-shift'),
        tbtMs: audit('total-blocking-time'),
        ttfbMs: audit('server-response-time'),
        lcpElement,
      };
      console.log(`  ${label}: score ${result.score} — LCP ${Math.round(result.lcpMs ?? 0)}ms, CLS ${(result.cls ?? 0).toFixed(3)}, TBT ${Math.round(result.tbtMs ?? 0)}ms`);
      if (lcpElement) console.log(`      LCP element: ${lcpElement.nodeLabel ?? lcpElement.selector ?? '?'}  ${lcpElement.snippet ? '— ' + lcpElement.snippet : ''}`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`  ${label} attempt ${attempt} failed: ${err}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 10_000));
    }
  }
  return { label, url, score: null, lcpMs: null, cls: null, tbtMs: null, ttfbMs: null, error: String(lastError) };
}

export async function main() {
  const apiKey = requireEnv('PSI_API_KEY');
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const targets = await buildTargets(supabaseUrl, serviceKey);
  console.log(`Running PSI (mobile) against ${targets.length} pages...`);

  const pages = [];
  for (const [label, url] of targets) {
    pages.push(await runPsi(apiKey, label, url));
  }

  const snapshot = {
    day: new Date().toISOString().slice(0, 10),
    kind: 'psi',
    data: { fetchedAt: new Date().toISOString(), strategy: 'mobile', pages },
  };

  const res = await fetch(`${supabaseUrl}/rest/v1/daily_health_snapshots?on_conflict=day,kind`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([snapshot]),
  });
  if (!res.ok) throw new Error(`Snapshot upsert → ${res.status}: ${await res.text()}`);

  const failed = pages.filter((p) => p.score == null);
  console.log(`Stored snapshot for ${snapshot.day} (${pages.length} pages, ${failed.length} failed).`);
  if (failed.length === pages.length) {
    console.error('Every PSI run failed.');
    process.exit(1);
  }
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
