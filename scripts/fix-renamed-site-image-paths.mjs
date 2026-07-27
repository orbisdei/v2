#!/usr/bin/env node
// ============================================================
// One-off follow-up for the site-naming-consistency fix: 25 site ids were
// renamed directly in the DB (19 apostrophe-to-dash convention fixes, via
// lib/utils.ts generateSiteId, plus 6 ids that had drifted from their name
// after a later translation/rename) without R2 credentials available to
// also move the sites' photos. This script re-keys any
// R2-hosted site_images row to the canonical sites/{site-id}/{NNN}.jpg path
// for its site's CURRENT id (same rename lib/storage.ts's renameSiteImage
// does on every publish-site-edit save) and updates the stored URL.
//
// Usage:
//   node scripts/fix-renamed-site-image-paths.mjs            dry run (default)
//   node scripts/fix-renamed-site-image-paths.mjs --apply    actually rename + update DB
//
// Requires .env.local with SUPABASE creds + R2 creds (see CLAUDE.md).
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function loadEnvLocal() {
  const path = '.env.local';
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    const val = rawVal.trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

for (const [name, val] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: R2_BUCKET, R2_PUBLIC_URL,
})) {
  if (!val) {
    console.error(`Missing env var ${name} (check .env.local)`);
    process.exit(1);
  }
}

// The 25 sites renamed in the DB by the 2026-07-27 naming-consistency fix.
const RENAMED_SITE_IDS = [
  'be-brussels-st-catherines-church',
  'eg-saint-catherine-st-catherines-monastery-mount-sinai',
  'fr-domremy-la-pucelle-joan-of-arcs-birthplace-house',
  'fr-plan-daups-sainte-baume-grotto-of-st-baume',
  'fr-sainte-anne-dauray-basilica-of-st-anne-dauray',
  'fr-vannes-st-peters-cathedral-of-vannes',
  'gb-greater-london-site-of-kings-bench-prison',
  'gb-marazion-st-michaels-mount',
  'ie-great-skellig-st-fionans-monastery-at-skellig-michael',
  'in-kolkata-nirmala-shishu-bhavan-childrens-home-of-the-immaculate-heart',
  'in-nagercoil-st-xaviers-cathedral',
  'in-punnaikayal-st-xaviers-church',
  'it-monte-santangelo-sanctuary-of-st-michael-the-archangel',
  'it-rome-santandrea-delle-fratte-st-andrew-of-the-thickets',
  'it-santambrogio-di-torino-saint-michaels-abbey',
  'jp-bunkyo-st-marys-cathedral',
  'jp-osaka-osaka-takamatsu-cathedral-st-marys-cathedral',
  'jp-tsuwano-otometoge-st-marys-chapel',
  'us-new-york-st-patricks-cathedral',
  'fr-chinon-chinon-castle-grand-royal-lodgings',
  'fr-greux-chapel-of-our-lady-of-bermont',
  'fr-rouen-cross-of-recognition-place-du-vieux-marche',
  'fr-rouen-joan-of-arcs-tower-keep-of-rouen-castle',
  'fr-sainte-catherine-de-fierbois-church-of-st-catherine-of-fierbois',
  'fr-vaucouleurs-crypt-of-our-lady-of-the-vaults-chapel-of-the-vaults',
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const r2 = new S3Client({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

async function renameImage(row) {
  const oldKey = row.url.slice(R2_PUBLIC_URL.length + 1);
  const newKey = `sites/${row.site_id}/${String(row.display_order + 1).padStart(3, '0')}.jpg`;
  if (oldKey === newKey) return null;

  const newUrl = `${R2_PUBLIC_URL}/${newKey}`;
  console.log(`${APPLY ? 'Renaming' : '[dry-run] Would rename'}: ${oldKey}  ->  ${newKey}`);
  if (!APPLY) return newUrl;

  const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
  const body = await obj.Body.transformToByteArray();
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: newKey, Body: body,
    ContentType: obj.ContentType || 'image/jpeg',
    CacheControl: 'public, max-age=31536000',
  }));
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));

  const { error } = await supabase.from('site_images').update({ url: newUrl }).eq('id', row.id);
  if (error) throw new Error(`DB update failed for site_images.id=${row.id}: ${error.message}`);

  return newUrl;
}

async function main() {
  const { data: rows, error } = await supabase
    .from('site_images')
    .select('id, site_id, url, display_order')
    .in('site_id', RENAMED_SITE_IDS)
    .order('site_id')
    .order('display_order');
  if (error) throw error;

  console.log(`Found ${rows.length} image row(s) across ${RENAMED_SITE_IDS.length} renamed sites.`);
  console.log(APPLY ? 'Mode: APPLY (writing to R2 + DB)' : 'Mode: DRY RUN (pass --apply to write)');
  console.log('');

  let changed = 0;
  for (const row of rows) {
    if (!row.url.startsWith(R2_PUBLIC_URL)) {
      console.log(`Skipping non-R2 URL for ${row.site_id}: ${row.url}`);
      continue;
    }
    const result = await renameImage(row);
    if (result) changed++;
  }

  console.log(`\nDone. ${changed} image(s) ${APPLY ? 'renamed' : 'need renaming'}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
