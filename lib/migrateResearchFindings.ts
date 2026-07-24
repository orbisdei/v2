import type { SupabaseClient } from '@supabase/supabase-js';
import { reverseGeocode, forwardGeocode } from '@/lib/geocode';
import { createSiteWithRelations, toSiteFormValues, toLinkEntries, toCelebrationEntries } from '@/lib/createSite';
import { slugify } from '@/lib/utils';
import { safeExternalFetch } from '@/lib/safeFetch';

// ─────────────────────────────────────────────────────────────────────────────
// Migrates high-confidence rows from `research_findings` (populated by the
// external discovery pipeline) into real `sites`. Framework-agnostic core —
// importable from the admin API route, the cron GET handler, or a script.
//
//   status='candidate'            + confidence='high' → net-new sites (auto-created)
//   status='proposed_modification'+ confidence='high' → diff only, never auto-applied
//
// Everything else is left untouched. See MIGRATION prompt for the full spec.
//
// v2 changes (2026-07-24), all scoped to the straight-through (no-human-review)
// path only — the proposed_modification path below is untouched:
//   - native_name, source_links, celebrations now flow through into sites/
//     site_links/site_celebrations instead of being hardcoded null/[]/[].
//   - verified_maps_url (Step 4's independently-confirmed Google Maps URL, from
//     Discovery prompt v9) is tried FIRST for coordinates, via plain regex/redirect
//     resolution — no Places API call at all when this works. Falls back to the
//     existing Google Places → Nominatim chain only when it's absent or unusable.
//   - Google Places text search now sends `regionCode` (the candidate's own
//     country) as a bias. This is a request parameter, not a response field —
//     it does not change the billing SKU.
//   - Country mismatches (candidate vs. reverse-geocode) now HOLD the row for
//     review instead of only logging a warning nobody reads. Municipality
//     mismatches remain warning-only (that signal is much fuzzier).
//   - VALID_INTEREST includes 'topical' (the discovery prompt's real 4th tier —
//     'personal' is a separate, distinct value, untouched by this pipeline).
//
// Deliberately NOT done, per explicit instruction to avoid any Google Places
// billing-tier increase: no `places.displayName` cross-check against the
// search result, and no `places.websiteUri` fetch for auto-populated official
// websites. Both would move the call from the free "Essentials ID Only" SKU to
// a paid tier. If you want either later, they're cheap to add back in — see
// the review doc, section 7.2 and 7.6(b).
// ─────────────────────────────────────────────────────────────────────────────

// Profile id for the 'Claude' identity. Pipeline-created sites are attributed
// to this profile permanently — this is not a placeholder to be swapped out.
const CREATED_BY = '8570cd60-9e9b-41d7-8a8b-c2d983cb936a';

// Interest levels the app renders specially. 'topical' is the discovery
// prompt's real 4th tier in the global→regional→local→topical hierarchy.
// 'personal' is a separate, pre-existing value with its own meaning — kept
// here so it still passes through without a spurious warning, but the
// pipeline itself never assigns it.
const VALID_INTEREST = new Set(['global', 'regional', 'local', 'topical', 'personal']);

// Proximity gate for duplicate detection (lat AND lon), matching
// app/api/import-sites/route.ts. ~1.1km — deliberately loose, because it is only
// the FIRST half of the test: a candidate must also pass `namesMatch` below.
// Proximity alone produces false positives in dense historic centres (e.g. the
// Gesù, San Clemente and Sant'Ignazio all sit <1km from unrelated basilicas in
// Rome), which would permanently skip legitimately new sites.
const DUP_THRESHOLD_DEG = 0.01;

// Generic words shared by most holy-site names; stripped before comparison so
// similarity is judged on the distinctive tokens ("gesu", "clemente", "lateran").
const NAME_STOPWORDS = new Set([
  'the', 'of', 'and', 'a', 'at', 'in', 'on',
  'de', 'del', 'della', 'delle', 'di', 'dei', 'da', 'do', 'dos', 'das',
  'la', 'le', 'el', 'los', 'las', 'les', 'il', 'lo', 'al', 'alla', 'allo', 'aux', 'du', 'des',
  'saint', 'sainte', 'st', 'ste', 'san', 'santa', 'santo', 'sant', 'sao', 'sta',
  'church', 'basilica', 'cathedral', 'chapel', 'shrine', 'sanctuary', 'santuario',
  'parish', 'monastery', 'abbey', 'convent', 'catholic', 'iglesia', 'eglise',
  'kirche', 'igreja', 'chiesa', 'capela', 'chapelle', 'notre', 'dame', 'our', 'lady',
]);

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // drop parenthetical translations
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distinctiveTokens(s: string): Set<string> {
  // Drop 1-char tokens too — the possessive in "St. Peter's" normalizes to a
  // stray "s" that would otherwise dilute the ratio.
  return new Set(
    normalizeName(s)
      .split(' ')
      .filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t))
  );
}

/**
 * True when two site names plausibly refer to the same place. Paired with the
 * proximity gate so a duplicate must be BOTH nearby AND similarly named.
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ta = distinctiveTokens(a);
  const tb = distinctiveTokens(b);
  // All-generic names (e.g. "The Cathedral") fall back to full normalized equality.
  if (ta.size === 0 || tb.size === 0) return false;

  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;

  // Divide by the LARGER token set so unmatched distinctive words count against
  // the score: "Catacombs of San Valentino" vs "Basilica of San Valentino" share
  // only "valentino" and must not be treated as the same place.
  if (shared / Math.max(ta.size, tb.size) >= 0.6) return true;

  // Superset case — "Basilica of Bom Jesus" vs "Basilica of Bom Jesus, Old Goa".
  // Requires >=2 shared distinctive tokens so a single shared saint name is never
  // enough on its own.
  return shared >= 2 && shared / Math.min(ta.size, tb.size) >= 0.8;
}

export interface MigrationOptions {
  dryRun?: boolean; // default true — caller must explicitly pass false to write
  limit?: number; // default 10 — batch size per invocation (keeps each run under the fn timeout)
}

export interface ProposedUpdate {
  findingId: string;
  siteId: string | null; // matched site id, or null if no exact-name match
  siteName: string;
  diff: string; // human-readable proposed diff — never auto-applied
}

export interface MigrationResult {
  dryRun: boolean;
  processed: number;
  created: string[]; // new site ids (or ids that WOULD be created, in dry-run)
  skipped: { id: string; reason: string }[]; // resolved decisions — row is done
  /** Ambiguous rows: NOT created and NOT auto-approved. Held in research_findings
   *  for human review rather than straight-through processed. */
  deferred: { id: string; reason: string }[];
  tagsCreated: string[]; // topic tag ids auto-created (or would be, in dry-run)
  proposedUpdates: ProposedUpdate[]; // proposed_modification diffs for human review
  warnings: string[]; // non-fatal: odd interest, reverse-geocode disagreements, etc.
  errors: { id: string; message: string }[];
}

// ── Nominatim pacing ─────────────────────────────────────────────────────────
// Nominatim's usage policy requires ~1.1s between calls. Both forwardGeocode
// (fallback) and reverseGeocode hit it, so gate every Nominatim call through here.
let lastNominatimAt = 0;
async function paceNominatim(): Promise<void> {
  const wait = 1100 - (Date.now() - lastNominatimAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}

// ── Google Places Text Search — same pattern as enrich-site-coords/import-sites.
// Field mask stays `places.id,places.location` — the free "Essentials ID Only"
// SKU. `regionCode` is a request parameter (bias only), not a response field,
// so adding it does not move this to a paid tier.
async function googlePlacesLookup(
  query: string,
  regionCode?: string | null
): Promise<{ lat: number; lon: number; placeId: string | null } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const body: Record<string, unknown> = { textQuery: query };
    if (regionCode) body.regionCode = regionCode;
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.location',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const place = data.places?.[0];
    if (place?.location && typeof place.location.latitude === 'number') {
      return { lat: place.location.latitude, lon: place.location.longitude, placeId: place.id ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Extract coordinates directly from a Google Maps URL — no API call at all.
// Same patterns as the `gmaps` mode in app/api/import-sites/route.ts.
function extractCoordsFromMapsUrl(url: string): { lat: number; lon: number } | null {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
  const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) return { lat: parseFloat(dMatch[1]), lon: parseFloat(dMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]) };
  return null;
}

/**
 * Resolves `verified_maps_url` (from Discovery prompt v9's Step 4) to a
 * coordinate, preferring a plain regex match and falling back to following
 * redirects (a `HEAD` fetch, not a Google API call — no billing impact
 * either way) for shortened/canonical URLs that only embed coordinates after
 * resolution. Returns null if neither works, so the caller can fall back to
 * the existing Places/Nominatim chain.
 */
async function resolveVerifiedMapsUrl(url: string): Promise<{ lat: number; lon: number } | null> {
  const direct = extractCoordsFromMapsUrl(url);
  if (direct) return direct;
  try {
    const res = await safeExternalFetch(url, { method: 'HEAD' });
    if (res.url) return extractCoordsFromMapsUrl(res.url);
  } catch {
    // fall through
  }
  return null;
}

/** Great-circle distance in whole metres — used to explain proximity holds. */
function metresBetween(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Eastern-time operational stamp for research_findings.import_status.
 *  America/New_York observes DST automatically (EDT/EST) — no hardcoded offset. */
function importStatusStamp(prefix: string): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value;
  return `${prefix} at ${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** 'ignatius-loyola' → 'Ignatius Loyola' for auto-created topic tags. */
function titleCaseRef(ref: string): string {
  return ref
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface SourceLink {
  url: string;
  link_type: string;
}

interface CelebrationRow {
  date_label: string;
  description: string;
}

interface ResearchFinding {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  municipality: string | null;
  interest: string | null;
  tags: string[] | null;
  existing_site_name: string | null;
  current_short_description: string | null;
  change_summary: string | null;
  native_name: string | null;
  source_links: SourceLink[] | null;
  celebrations: CelebrationRow[] | null;
  verified_maps_url: string | null;
}

export async function runResearchFindingsMigration(
  supabase: SupabaseClient,
  options?: MigrationOptions
): Promise<MigrationResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 10;

  const result: MigrationResult = {
    dryRun,
    processed: 0,
    created: [],
    skipped: [],
    deferred: [],
    tagsCreated: [],
    proposedUpdates: [],
    warnings: [],
    errors: [],
  };

  // ── Batch of net-new candidates: high confidence, not yet processed ──────────
  const { data: candidates, error: candErr } = await supabase
    .from('research_findings')
    .select(
      'id,name,description,country,municipality,interest,tags,existing_site_name,current_short_description,change_summary,native_name,source_links,celebrations,verified_maps_url'
    )
    .eq('status', 'candidate')
    .eq('confidence', 'high')
    .is('import_status', null)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (candErr) throw new Error(`Failed to load candidates: ${candErr.message}`);

  // Single up-front fetch for dedup + slug uniqueness.
  const { data: existingSites, error: sitesErr } = await supabase
    .from('sites')
    .select('id,name,latitude,longitude');
  if (sitesErr) throw new Error(`Failed to load sites: ${sitesErr.message}`);
  const existingIds = new Set((existingSites ?? []).map((s) => s.id));
  const assignedThisBatch = new Set<string>();

  // Resolve tag refs across the whole batch in one query.
  const allTagRefs = [
    ...new Set((candidates ?? []).flatMap((c) => (c.tags as string[] | null) ?? [])),
  ];
  const knownTagIds = new Set<string>();
  if (allTagRefs.length > 0) {
    const { data: tagRows } = await supabase.from('tags').select('id').in('id', allTagRefs);
    for (const t of tagRows ?? []) knownTagIds.add(t.id);
  }

  const findings = (candidates ?? []) as ResearchFinding[];
  result.processed += findings.length;

  for (const f of findings) {
    try {
      const query = [f.name, f.municipality, f.country].filter(Boolean).join(', ');

      // 1. Geocode. Three tiers, in order of trust and cost:
      //    a) verified_maps_url from Discovery prompt v9 (Step 4's confirmed
      //       identity) — regex/redirect only, no Places API call at all.
      //    b) Google Places text search, biased with regionCode — free tier.
      //    c) Nominatim forward-geocode — free, rate-limited fallback.
      let lat: number | null = null;
      let lon: number | null = null;
      let placeId: string | null = null;
      let usedVerifiedUrl = false;

      if (f.verified_maps_url) {
        const resolved = await resolveVerifiedMapsUrl(f.verified_maps_url);
        if (resolved) {
          lat = resolved.lat;
          lon = resolved.lon;
          usedVerifiedUrl = true;
        }
      }

      if (lat == null || lon == null) {
        const g = await googlePlacesLookup(query, f.country);
        if (g) {
          lat = g.lat;
          lon = g.lon;
          placeId = g.placeId;
        } else {
          await paceNominatim();
          const fwd = await forwardGeocode(query);
          if (fwd.lat != null && fwd.lon != null) {
            lat = fwd.lat;
            lon = fwd.lon;
          }
        }
      }

      if (lat == null || lon == null || (lat === 0 && lon === 0)) {
        const reason = 'no coordinates found';
        result.skipped.push({ id: f.id, reason });
        if (!dryRun) await markStatus(supabase, f.id, importStatusStamp('Skipped — no coordinates found'));
        continue;
      }

      // 2. Duplicate check (before reverse-geocode to avoid a wasted Nominatim call).
      // A duplicate must be BOTH nearby AND similarly named — proximity alone
      // collapses distinct churches that share a city centre.
      const nearby = (existingSites ?? []).filter(
        (e) =>
          e.latitude != null &&
          e.longitude != null &&
          Math.abs(e.latitude - lat!) < DUP_THRESHOLD_DEG &&
          Math.abs(e.longitude - lon!) < DUP_THRESHOLD_DEG
      );
      const dup = nearby.find((e) => namesMatch(f.name, e.name ?? ''));
      if (dup) {
        result.skipped.push({ id: f.id, reason: `duplicate of ${dup.id}` });
        if (!dryRun) await markStatus(supabase, f.id, importStatusStamp(`Skipped — duplicate of ${dup.id}`));
        continue;
      }
      // Nearby but differently named — AMBIGUOUS, so this row is not straight-through
      // material. Do NOT create it and do NOT stamp import_status: leaving the row
      // untouched keeps it in research_findings for human review alongside the
      // medium/low-confidence rows. Only unambiguous rows are auto-created.
      // (This is exactly the Sant'Ignazio alla Storta case: Google returned the more
      // famous Campo Marzio church, landing 0m from an existing site under a name
      // that shares no tokens — proximity is the only signal that anything is wrong.
      // A verified_maps_url from Discovery v9 sidesteps this case entirely, since it
      // never runs the ambiguous text search to begin with.)
      if (nearby.length > 0) {
        const detail = nearby
          .map((e) => `${e.id} @${metresBetween(lat, lon, e.latitude!, e.longitude!)}m`)
          .join(', ');
        result.deferred.push({
          id: f.id,
          reason: `possible duplicate — ${nearby.length} site(s) within ~1km with different names (${detail})`,
        });
        // Stamped 'Held', NOT 'Skipped': the row is not imported and not approved,
        // but it is removed from the `import_status IS NULL` work queue. Without a
        // stamp these rows requeue on every cron tick — and because the batch is
        // ordered by created_at ASC with a small limit, a handful of held rows at
        // the head would consume the entire batch forever and starve new findings.
        // Clearing the stamp (set import_status = NULL) re-queues them once the
        // upstream data is hydrated.
        if (!dryRun) {
          await markStatus(supabase, f.id, importStatusStamp(`Held for review — possible duplicate (${detail})`));
        }
        continue;
      }

      // 3. Reverse-geocode to fill region. Country disagreement is a strong,
      //    unambiguous signal (country boundaries aren't fuzzy the way
      //    municipality strings are) — HOLD rather than just warn, since a
      //    wrong-country geocode is exactly the Beaurevoir failure mode.
      //    Municipality disagreement stays warning-only.
      await paceNominatim();
      const rev = await reverseGeocode(lat, lon);
      if (rev.country && f.country && rev.country.toUpperCase() !== f.country.toUpperCase()) {
        const detail = `candidate said ${f.country}, reverse-geocode says ${rev.country}`;
        result.deferred.push({ id: f.id, reason: `country mismatch — ${detail}` });
        if (!dryRun) {
          await markStatus(supabase, f.id, importStatusStamp(`Held for review — country mismatch (${detail})`));
        }
        continue;
      }
      if (rev.municipality && f.municipality && rev.municipality !== f.municipality) {
        result.warnings.push(
          `${f.name}: reverse-geocoded municipality ${rev.municipality} disagrees with source ${f.municipality}`
        );
      }
      const country = (rev.country || f.country || '').toUpperCase();
      const municipality = rev.municipality || f.municipality || '';
      const region = rev.region || '';

      // 4. Unique slug, matching the established site-id convention:
      //    {country}-{municipality}-{name}, e.g. it-rome-church-of-the-gesu.
      //    All 274 existing sites use this shape. (Note: app/api/import-sites
      //    writes a bare slugify(name) instead and is inconsistent with the
      //    table — that route needs the same fix, tracked separately.)
      //    Uses the STORED municipality (reverse-geocoded value wins) so the id
      //    agrees with the row it labels.
      const idBase = [country.toLowerCase(), slugify(municipality), slugify(f.name)]
        .filter(Boolean)
        .join('-');
      let id = idBase;
      let n = 2;
      while (!id || existingIds.has(id) || assignedThisBatch.has(id)) {
        id = `${idBase}-${n++}`;
      }

      // 5. Tags: resolve refs; auto-create any unknown ref as a topic tag.
      const tagRefs = (f.tags as string[] | null) ?? [];
      for (const ref of tagRefs) {
        if (knownTagIds.has(ref)) continue;
        if (!dryRun) {
          const { error: tagErr } = await supabase
            .from('tags')
            .insert({ id: ref, name: titleCaseRef(ref), type: 'topic' });
          if (tagErr) throw new Error(`Tag create '${ref}' failed: ${tagErr.message}`);
        }
        knownTagIds.add(ref);
        result.tagsCreated.push(ref);
      }

      // 6. Interest: pass through, flag if non-standard.
      const interest = f.interest || '';
      if (interest && !VALID_INTEREST.has(interest)) {
        result.warnings.push(`${f.name}: non-standard interest '${interest}' passed through`);
      }

      // 7/8. Build payload + create the site (unless dry-run).
      //    google_maps_url: prefer the Discovery-verified URL as-is (it's the
      //    exact place a human/model already confirmed) over reconstructing
      //    one from a placeId, which is only available when we fell back to
      //    the Places text search.
      const mapsUrl = usedVerifiedUrl
        ? f.verified_maps_url!
        : placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${placeId}`
        : '';
      const values = toSiteFormValues({
        name: f.name,
        short_description: f.description ?? '',
        country,
        region,
        municipality,
        latitude: lat,
        longitude: lon,
        google_maps_url: mapsUrl,
        native_name: f.native_name ?? null,
        interest,
        tag_ids: tagRefs,
      });

      const linkEntries = toLinkEntries(f.source_links ?? []);
      const celebrationEntries = toCelebrationEntries(f.celebrations ?? []);

      if (!dryRun) {
        await createSiteWithRelations(supabase, {
          id,
          values,
          links: linkEntries,
          celebrations: celebrationEntries,
          images: [],
          createdBy: CREATED_BY,
          // false, NOT true: has_no_image means "an admin confirmed this site has
          // no image available", not "no image yet". Setting it here would hide
          // every imported site from the admin Missing-photos filter and the
          // daily health email's sites-without-photos table.
          hasNoImage: false,
        });
        // 9/10. Operational marker + keep the existing review-state flags in sync.
        await supabase
          .from('research_findings')
          .update({ import_status: importStatusStamp('Ingested'), reviewed: true, approved: true })
          .eq('id', f.id);
      }

      existingIds.add(id);
      assignedThisBatch.add(id);
      result.created.push(id);
    } catch (err) {
      // Leave import_status untouched so a failed row is retried next run.
      result.errors.push({ id: f.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── Part 2: proposed_modification — diff only, never auto-applied ─────────────
  // Unchanged in v2: this path is already a human-review path by construction
  // (a diff, never auto-applied), which overlaps with the deferred medium/low
  // pathway work being held for later.
  const { data: proposals, error: propErr } = await supabase
    .from('research_findings')
    .select('id,existing_site_name,current_short_description,change_summary,description')
    .eq('status', 'proposed_modification')
    .eq('confidence', 'high')
    .is('import_status', null)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (propErr) throw new Error(`Failed to load proposals: ${propErr.message}`);

  result.processed += (proposals ?? []).length;

  for (const p of proposals ?? []) {
    try {
      const existingName = (p.existing_site_name as string | null) ?? '';
      if (!existingName) {
        result.skipped.push({ id: p.id, reason: 'proposal has no existing_site_name' });
        continue;
      }
      // Exact match only — no fuzzy matching.
      const { data: match } = await supabase
        .from('sites')
        .select('id,name')
        .eq('name', existingName)
        .limit(1)
        .maybeSingle();
      if (!match) {
        // Leave unmarked: the site may be created later, enabling a future match.
        result.skipped.push({ id: p.id, reason: `no site named "${existingName}"` });
        continue;
      }
      const diff =
        `Site "${match.name}" (${match.id})\n` +
        `  change: ${p.change_summary ?? '(no summary)'}\n` +
        `  current:  ${p.current_short_description ?? '(none)'}\n` +
        `  proposed: ${p.description ?? '(none)'}`;
      result.proposedUpdates.push({ findingId: p.id, siteId: match.id, siteName: match.name, diff });
      if (!dryRun) {
        // Mark reviewed so it stops cluttering dry-runs; approved stays false
        // until a human applies the change.
        await markStatus(supabase, p.id, importStatusStamp('Reviewed') + ' — pending manual apply');
      }
    } catch (err) {
      result.errors.push({ id: p.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

async function markStatus(supabase: SupabaseClient, id: string, status: string): Promise<void> {
  await supabase.from('research_findings').update({ import_status: status }).eq('id', id);
}
