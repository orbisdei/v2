import type { SupabaseClient } from '@supabase/supabase-js';
import { reverseGeocode, forwardGeocode, extractCoordsFromMapsUrl } from '@/lib/geocode';
import { googlePlacesLookupDetailed, buildMapsSearchUrl } from '@/lib/places';
import { namesMatch, findNearbySites } from '@/lib/siteMatch';
import { toLinkEntries, toCelebrationEntries, linksToPayload, celebrationsToPayload } from '@/lib/createSite';
import { generateSiteId } from '@/lib/utils';

// Country → dominant Wikipedia language code. Used by the native_name backfill
// (backfillNativeNameFromWikidata) to pick which language's Wikidata sitelink
// to read. Deliberately small and explicit — extend only for countries
// actually appearing in this dataset. Skip (no entry → null) rather than guess
// for anything multilingual (India, etc.) or not listed here.
const COUNTRY_TO_WIKI_LANG: Record<string, string> = {
  FR: 'fr', BE: 'fr',
  PT: 'pt', BR: 'pt',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', EC: 'es', BO: 'es', PE: 'es', CL: 'es',
  IT: 'it',
  JP: 'ja',
  ID: 'id',
  DE: 'de', AT: 'de',
  PL: 'pl',
  CZ: 'cs',
};

// Shared across every Wikimedia/Wikidata call this file makes — same UA string
// used for the native_name backfill below and by lib/imageImport.ts.
const WIKIMEDIA_USER_AGENT = 'OrbisDei/1.0 (orbisdei.org)';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Best-effort native_name backfill via Wikidata language links — zero LLM
 * tokens, a couple of cheap public API calls. Only ever called when Step 2's
 * native-language research pass (the authoritative source) left native_name
 * empty; never overwrites a value Discovery already captured, and never touches
 * `name`.
 *
 * 1. Resolve the Wikidata QID for the Wikipedia article in source_links (if
 *    any) via the pageprops query (pageprops.wikibase_item = QID).
 * 2. Fetch that Wikidata item and read its sitelink title for the site's own
 *    dominant Wikipedia language (COUNTRY_TO_WIKI_LANG) — the real local-
 *    language article title, not a guess.
 * 3. No Wikipedia link, no confident language mapping, or no matching sitelink
 *    → return null (expected miss rate, not a failure). Any throw is swallowed.
 */
export async function backfillNativeNameFromWikidata(
  sourceLinks: SourceLink[] | null,
  country: string | null
): Promise<string | null> {
  const wikiLink = (sourceLinks ?? []).find((l) => l.link_type === 'Wikipedia' || /wikipedia\.org/.test(l.url));
  if (!wikiLink) return null;
  try {
    const url = new URL(wikiLink.url);
    const titleMatch = url.pathname.match(/\/wiki\/(.+)$/);
    if (!titleMatch) return null;
    const title = decodeURIComponent(titleMatch[1]);
    const enHost = url.hostname; // usually en.wikipedia.org, but respect whatever language the link is actually in

    const propsRes = await fetch(
      `https://${enHost}/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageprops&format=json&origin=*`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (!propsRes.ok) return null;
    const propsData = await propsRes.json();
    const pages = propsData?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as Record<string, unknown>;
    const qid = (page.pageprops as Record<string, unknown> | undefined)?.wikibase_item as string | undefined;
    if (!qid) return null;

    const langCode = COUNTRY_TO_WIKI_LANG[(country ?? '').toUpperCase()];
    if (!langCode) return null; // no confident language mapping for this country — skip rather than guess

    const entityRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
    });
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json();
    const sitelinks = entityData?.entities?.[qid]?.sitelinks;
    const localTitle = sitelinks?.[`${langCode}wiki`]?.title as string | undefined;
    return localTitle ?? null;
  } catch {
    return null;
  }
}

interface WikipediaSitelink {
  lang: string;
  title: string;
}

/** Fetches the REST summary for one language edition + title, returning the
 *  lead image URL (originalimage preferred, thumbnail fallback) or null. */
async function fetchWikipediaLeadImageUrl(lang: string, title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (!res.ok) return null;
    const summary = await res.json();
    return summary?.originalimage?.source ?? summary?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

/**
 * v10 (2026-07-27) — candidate-only Wikipedia lead-image sourcing, replacing
 * the removed Discovery-captured wikipedia_image_url/_candidates approach with
 * a live lookup at promotion time:
 *
 * 1. Read the row's own `source_links` for an entry with link_type ===
 *    'Wikipedia'. None → null (nothing further to do).
 * 2. Resolve every language edition of that article via its own REST summary
 *    (wikibase_item = the Wikidata QID) and that QID's Wikidata sitelinks,
 *    filtered to real Wikipedia editions (`^[a-z]+wiki$`, excludes
 *    wikivoyage/wikinews/etc).
 * 3. Pick one edition's lead image: the site's own dominant Wikipedia language
 *    (COUNTRY_TO_WIKI_LANG — the same table backfillNativeNameFromWikidata
 *    uses, kept as the single source of truth for both) preferred, else
 *    English, else whichever remaining edition actually has a lead image.
 *    Reuses the origin article's own already-fetched summary when it happens
 *    to be the winning edition, saving a request.
 *
 * Sequential requests only, each on its own await, with a short pause between
 * them (Wikimedia's own etiquette rules ask for a descriptive User-Agent and a
 * reasonable pace, not a rigid quota) — never touches has_no_image, never
 * throws (a miss anywhere in the chain just returns null).
 */
export async function resolveWikipediaLeadImage(
  sourceLinks: SourceLink[] | null,
  country: string | null
): Promise<string | null> {
  const wikiLink = (sourceLinks ?? []).find((l) => l.link_type === 'Wikipedia');
  if (!wikiLink) return null;

  let originLang: string;
  let title: string;
  try {
    const url = new URL(wikiLink.url);
    const titleMatch = url.pathname.match(/\/wiki\/(.+)$/);
    if (!titleMatch) return null;
    title = decodeURIComponent(titleMatch[1]);
    const langMatch = url.hostname.match(/^([a-z-]+)\.wikipedia\.org$/);
    originLang = langMatch ? langMatch[1] : 'en';
  } catch {
    return null;
  }

  // Step 2a: resolve the Wikidata QID from the article's own REST summary —
  // and keep whatever lead image it reports, in case this edition wins below.
  let qid: string | null = null;
  let originImage: string | null = null;
  try {
    const res = await fetch(
      `https://${originLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (!res.ok) return null;
    const summary = await res.json();
    qid = summary?.wikibase_item ?? null;
    originImage = summary?.originalimage?.source ?? summary?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
  if (!qid) return null;
  await sleep(150);

  // Step 2b: every language edition with an actual Wikipedia article.
  let sitelinks: WikipediaSitelink[] = [];
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawSitelinks = (data?.entities?.[qid]?.sitelinks ?? {}) as Record<string, { title: string }>;
    sitelinks = Object.entries(rawSitelinks)
      .filter(([site]) => /^[a-z]+wiki$/.test(site))
      .map(([site, v]) => ({ lang: site.replace(/wiki$/, ''), title: v.title }));
  } catch {
    return null;
  }
  if (sitelinks.length === 0) return null;
  await sleep(150);

  // Step 3: preferred language → English → whichever remaining edition has an image.
  const preferredLang = COUNTRY_TO_WIKI_LANG[(country ?? '').toUpperCase()];
  const tried = new Set<string>();
  const order = [preferredLang, 'en', ...sitelinks.map((s) => s.lang)].filter(
    (lang): lang is string => !!lang
  );

  for (const lang of order) {
    if (tried.has(lang)) continue;
    tried.add(lang);
    const site = sitelinks.find((s) => s.lang === lang);
    if (!site) continue;
    if (lang === originLang) {
      if (originImage) return originImage;
      continue;
    }
    const imageUrl = await fetchWikipediaLeadImageUrl(lang, site.title);
    await sleep(150);
    if (imageUrl) return imageUrl;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Wikipedia lookups — NOT wired into any pipeline yet. Added ahead
// of the unified review-pane work so the eventual "Enrich" action on research
// candidates, the batch/single-row migration paths, and (per the "encapsulate
// automation in reusable functions" plan) a future affordance on normal site
// edit can all call the same two functions instead of each growing their own
// copy later:
//   findWikipediaArticleByTitle — "given a title, find its Wikipedia link"
//   findWikipediaImages         — "given a Wikipedia link, find its lead image
//                                   and trace related images"
// ─────────────────────────────────────────────────────────────────────────────

export interface WikipediaArticleMatch {
  url: string;
  lang: string;
  title: string; // canonical article title as Wikipedia has it, not necessarily identical to the input
}

/**
 * Given a plain site title (no existing source_links entry required),
 * searches Wikipedia for a matching article and returns its URL. The
 * counterpart to resolveWikipediaLeadImage's "link → images" direction —
 * this one goes "title → link". Intended callers: a fresh research candidate
 * Discovery didn't attach a Wikipedia link to, and (once wired in) normal
 * site edit whenever a site's name changes.
 *
 * Tries the site's own dominant Wikipedia language first (COUNTRY_TO_WIKI_LANG,
 * when `country` is known and mapped), then English, using each edition's REST
 * search endpoint (https://{lang}.wikipedia.org/w/rest.php/v1/search/page).
 * Takes the first hit — this is a best-effort title match, not a verified
 * "this article is really about this place" match (no coordinate or category
 * cross-check), so treat the result as a suggestion for a human to confirm,
 * not an authoritative link. Never throws; a miss in every tried language, or
 * any network failure, returns null.
 */
export async function findWikipediaArticleByTitle(
  title: string,
  country?: string | null
): Promise<WikipediaArticleMatch | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  const preferredLang = COUNTRY_TO_WIKI_LANG[(country ?? '').toUpperCase()];
  const langs = [preferredLang, 'en'].filter(
    (lang, i, arr): lang is string => !!lang && arr.indexOf(lang) === i
  );

  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(trimmed)}&limit=1`,
        { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
      );
      if (res.ok) {
        const data = await res.json();
        const page = data?.pages?.[0];
        if (page?.key) {
          return {
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.key)}`,
            lang,
            title: page.title ?? page.key,
          };
        }
      }
    } catch {
      // try the next language rather than failing outright
    }
    if (i < langs.length - 1) await sleep(150);
  }

  return null;
}

export interface WikipediaImageSet {
  leadImage: string | null;
  relatedImages: string[]; // additional image URLs beyond the lead image, deduped
}

/**
 * Given a Wikipedia article URL (e.g. from findWikipediaArticleByTitle above,
 * or an existing source_links entry), returns its lead image PLUS a broader
 * set of related images by tracing the article's Wikidata item to its linked
 * Commons category and listing that category's file members — the "trace all
 * related images" half of the same plan. Not wired into any pipeline yet.
 *
 * 1. REST summary for the given article → lead/thumbnail image + Wikidata QID.
 * 2. QID's Wikidata sitelinks → commonswiki sitelink ("Category:X"), if any.
 * 3. Commons categorymembers (cmtype=file) → up to 20 file titles.
 * 4. One batched Commons imageinfo lookup → direct URLs for those files,
 *    filtered to common raster photo extensions (jpg/jpeg/png). SVGs are
 *    excluded — on Commons those are overwhelmingly maps, coats of arms, and
 *    icons, not site photography.
 *
 * No Commons category, no QID, or a failure at any step just narrows the
 * result rather than throwing — {leadImage, []}, or even {null, []}, are both
 * valid non-error outcomes, not failures.
 */
export async function findWikipediaImages(wikipediaUrl: string): Promise<WikipediaImageSet> {
  const empty: WikipediaImageSet = { leadImage: null, relatedImages: [] };

  let lang: string;
  let title: string;
  try {
    const url = new URL(wikipediaUrl);
    const titleMatch = url.pathname.match(/\/wiki\/(.+)$/);
    if (!titleMatch) return empty;
    title = decodeURIComponent(titleMatch[1]);
    const langMatch = url.hostname.match(/^([a-z-]+)\.wikipedia\.org$/);
    if (!langMatch) return empty;
    lang = langMatch[1];
  } catch {
    return empty;
  }

  let leadImage: string | null = null;
  let qid: string | null = null;
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (!res.ok) return empty;
    const summary = await res.json();
    leadImage = summary?.originalimage?.source ?? summary?.thumbnail?.source ?? null;
    qid = summary?.wikibase_item ?? null;
  } catch {
    return empty;
  }
  if (!qid) return { leadImage, relatedImages: [] };
  await sleep(150);

  let commonsCategory: string | null = null;
  try {
    const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
      headers: { 'User-Agent': WIKIMEDIA_USER_AGENT },
    });
    if (res.ok) {
      const data = await res.json();
      commonsCategory = data?.entities?.[qid]?.sitelinks?.commonswiki?.title ?? null;
    }
  } catch {
    // no Commons category available — lead image alone is still a valid result
  }
  if (!commonsCategory) return { leadImage, relatedImages: [] };
  await sleep(150);

  let fileTitles: string[] = [];
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
        commonsCategory
      )}&cmtype=file&cmlimit=20&format=json&origin=*`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (res.ok) {
      const data = await res.json();
      fileTitles = ((data?.query?.categorymembers ?? []) as { title: string }[])
        .map((m) => m.title)
        .filter((t) => /\.(jpe?g|png)$/i.test(t));
    }
  } catch {
    return { leadImage, relatedImages: [] };
  }
  if (fileTitles.length === 0) return { leadImage, relatedImages: [] };
  await sleep(150);

  let relatedImages: string[] = [];
  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        fileTitles.join('|')
      )}&prop=imageinfo&iiprop=url&format=json&origin=*`,
      { headers: { 'User-Agent': WIKIMEDIA_USER_AGENT } }
    );
    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data?.query?.pages ?? {}) as Record<string, unknown>[];
      relatedImages = [
        ...new Set(
          pages
            .map((p) => (p.imageinfo as { url?: string }[] | undefined)?.[0]?.url)
            .filter((u): u is string => !!u && u !== leadImage)
        ),
      ];
    }
  } catch {
    return { leadImage, relatedImages: [] };
  }

  return { leadImage, relatedImages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrates high-confidence rows from `research_findings` (populated by the
// external discovery pipeline) into real `sites`. Framework-agnostic core —
// importable from the admin API route, the cron GET handler, or a script.
//
//   status='candidate'             → queued for admin approval (pending_submissions)
//   status='proposed_modification' → diff only, never auto-applied
//
// Everything else is left untouched. See MIGRATION prompt for the full spec.
//
// v15 changes (2026-08-01) — proposed_modification becomes reviewable, and
// geocode failures become diagnosable:
//   - proposed_modification rows are no longer a dead end. They used to
//     produce only a diff string in the run result that no review UI read, so
//     a proposed change to an existing site could never actually be applied
//     (the same shape of gap the old site_edits table had). They now queue as
//     pending_submissions (type='site', action='edit', site_id set) — exactly
//     like a contributor's edit to an existing site — and are reviewed
//     through the same SiteForm at /admin/research. The payload is a FULL
//     snapshot of the site's current state (including its images/links/
//     celebrations/tags, which /api/publish-site-edit replaces wholesale and
//     would otherwise delete) with ONLY the proposed fields overlaid, so
//     approving applies the proposal and nothing else.
//   - The "no coordinates" warning now says WHY. Both geocoders previously
//     collapsed every outcome to an empty result, so a missing
//     GOOGLE_PLACES_API_KEY, an HTTP failure, and a genuine no-match were
//     indistinguishable — see googlePlacesLookupDetailed (lib/places.ts) and
//     the new `error` fields on lib/geocode.ts's results. The warning now
//     names the failing tier and its cause, and quotes the exact query that
//     was searched, which is usually the actual problem.
//   - A reverse-geocode failure is now warned about too: region is derived
//     solely from that call, so its failure is why an otherwise-geocoded site
//     lands with a blank region.
//
// v15 changes (2026-08-01) — resolve native_name BEFORE geocoding:
//   - The Wikipedia-link lookup and the Wikidata native_name backfill moved
//     from near the end of the loop to before the geocode step, and
//     buildGeocodeQuery is now fed the RESOLVED native_name rather than only
//     whatever Discovery itself captured.
//   - Why: geocoding a site under its English name misses constantly, because
//     Nominatim indexes places under their local name. Verified against live
//     Nominatim while clearing the first real backlog:
//       "Basilica of Sts. Peter and Paul at Vysehrad, Prague, CZ" → no match
//       "Bazilika svatého Petra a Pavla, Praha"                   → found
//     Both name the same building. Under the old ordering the backfill
//     produced the working name a few steps too late to be used, so 15 of 19
//     rows in that backlog queued with no coordinates at all.
//   - backfillNativeNameFromWikidata now receives the candidate's own
//     f.country rather than the reverse-geocoded country (which doesn't exist
//     yet at this point). That value only selects which Wikipedia language to
//     prefer, so the tradeoff is minor next to fixing the geocode input.
//
// v14 changes (2026-07-30) — everything flows automatically, gates become warnings:
//   - Dropped the confidence='high' gate on both the candidate and
//     proposed_modification queries. Every unresolved row is now processed —
//     Discovery's confidence/confidence_reason ride along as a warning
//     (below) instead of deciding whether the row gets touched at all.
//   - The three conditions that used to block a candidate from ever reaching
//     `pending_submissions` — exact-name duplicate (silently skipped),
//     ambiguous nearby site, and country mismatch (both held indefinitely in
//     research_findings, invisible outside a raw query) — no longer skip or
//     hold anything. All three now queue the row exactly like any other
//     candidate, carrying a loud warning in payload.warnings instead. A human
//     reviewing the resulting submission sees the warning and decides, rather
//     than the row disappearing or getting stuck.
//   - New payload.warnings: string[] on every queued candidate — collects
//     every advisory signal (duplicate/mismatch, missing coordinates,
//     non-standard interest/site_type, missing native_name, zero source
//     links, zero images found, low Discovery confidence) in one place for
//     the reviewer, in addition to the existing result.warnings[] batch
//     summary (kept for the ResearchImportPanel display).
//   - New: findWikipediaArticleByTitle is tried when Discovery didn't capture
//     a Wikipedia source link, and findWikipediaImages traces whatever
//     Wikipedia link is available (Discovery's or the title-search result) to
//     its Commons category for images beyond the single lead image. Both are
//     defined earlier in this file, standalone, so they're also callable
//     one-off (e.g. from a "re-run enrichment" action in the review UI)
//     without going through the whole batch.
//   - This function is now called per-row from a Supabase Database Webhook on
//     research_findings INSERT (event-driven), in addition to the existing
//     manual triggers (ResearchImportPanel's batch button, single-row
//     reprocessing) — findingIds scopes a call to exactly the new row so a
//     webhook invocation stays small regardless of backlog size.
//
// v13 changes (2026-07-28) — dropped the dead wikipedia_image_url /
// wikipedia_image_url_override columns:
//   - Both columns had zero non-null rows across the whole research_findings
//     table — Discovery never resumed writing wikipedia_image_url after v9,
//     and the admin override field (added v9, exposed in the /admin/research
//     edit form) was never actually set by anyone; the live per-request
//     resolveWikipediaLeadImage() lookup (v10) already covers the candidate
//     path's lead-image needs. Removed from the DB, the candidate-path
//     override check (now always calls resolveWikipediaLeadImage directly),
//     the proposed_modification path's image-auto-apply block (its only
//     image source was these columns — nothing replaces it), the
//     MigrationResult.imagesImported field it populated, and the
//     research-findings API route/admin UI (ResearchFindingRow fields,
//     EditForm's override input + captured-image preview, the completeness
//     ring's "Lead image" check, pickThumbnail).
//
// v12 changes (2026-07-28) — a geocoding miss no longer drops the row:
//   - Previously, if neither Google Places nor Nominatim (nor a
//     google_maps_url_override) could resolve coordinates, the candidate was
//     stamped 'Skipped — no coordinates found' and never queued anywhere —
//     invisible everywhere except a raw research_findings query, since
//     coordinates were being treated as a publish-time requirement at
//     queue time. But the row isn't going live yet either way — it's only
//     queued into pending_submissions for admin review — and SiteForm
//     (ApprovalsPanel) already lets a reviewer look up or type coordinates by
//     hand before approving, exactly like the contribute flow.
//   - Now a coordinate miss still queues the candidate (with latitude/
//     longitude null in the payload) instead of skipping it, with a warning
//     flagging that coordinates need to be set manually. The proximity-based
//     duplicate check and reverse-geocode region/country-mismatch check both
//     require coordinates, so they're skipped in this case too (the warning
//     calls this out) — country/municipality fall back to the candidate's own
//     f.country/f.municipality instead of the reverse-geocoded values.
//     assertValidCoordinates (lib/createSite.ts) still blocks actual
//     publish until the admin sets valid coordinates, so nothing goes live
//     without them.
//
// Refactor note (2026-07-26, behavior unchanged): the duplicate-detection
// logic (namesMatch + proximity gate), the Google Places lookup, the Maps
// search-URL builder, and Nominatim pacing were extracted to lib/siteMatch.ts,
// lib/places.ts, and lib/geocode.ts (pacing is now inside the geocode helpers
// themselves) so the AI bulk-import routes share the exact same behavior.
//
// v11 changes (2026-07-27) — candidates route to the approval queue, not `sites`:
//   - High-confidence candidates no longer call createSiteWithRelations
//     directly. Instead they're inserted into `pending_submissions`
//     (type='site', action='create') — the SAME destination/shape as a
//     contributor's new-site submission and /admin/research's "Confirm and
//     Queue" — so every candidate now gets a full review (tags, links,
//     images, coordinates) in Admin → Pending Approvals before it's live.
//     No more fully-unattended site creation from this pipeline.
//   - The Wikipedia lead image (see v10) is resolved but no longer uploaded
//     here — it rides along in the payload as an external-URL image entry
//     and gets fetched/resized/uploaded to R2 at actual approval time
//     (AdminClient.handleApprove → createSiteWithRelations), exactly like any
//     contributor-submitted external image. Avoids spending R2 storage on
//     candidates that get rejected during review.
//   - research_findings.import_status is stamped 'Queued for approval'
//     instead of 'Ingested'; reviewed/approved/site_id are left alone since
//     no site exists yet — they get set (if ever) by the actual approval.
//   - MigrationResult gained `queued: {findingId, submissionId}[]`; `created`
//     stays in the shape for compatibility but is never populated by this
//     path anymore. proposed_modification (Part 2) is completely unchanged —
//     it was already diff-only/human-applied and never auto-created anything.
//
// v10 changes (2026-07-27) — live Wikipedia lead-image lookup, candidate path only:
//   - The candidate path no longer reads the `wikipedia_image_url` column at
//     all (Discovery stopped populating it — see v9). Instead
//     resolveWikipediaLeadImage() resolves an image live, at promotion time,
//     from the row's own `source_links` Wikipedia entry: REST summary → QID →
//     Wikidata sitelinks → pick one edition's lead image (native language
//     preferred, else English, else first available with an image). See its
//     doc comment for the full algorithm. Scoped to candidate rows only —
//     proposed_modification keeps reading `wikipedia_image_url`/override as
//     before (v9), unchanged by this.
//   - has_no_image is untouched either way, same as every version before it.
//
// v9 changes (2026-07-27):
//   - `wikipedia_image_candidates` (v7, jsonb array) was dropped from the DB and
//     the Discovery prompt reverted to capturing a single `wikipedia_image_url`
//     again — pickWikipediaImageCandidate/COUNTRY_TO_WIKI_LANG-for-images is
//     removed accordingly; native_name backfill still uses COUNTRY_TO_WIKI_LANG.
//   - New nullable `google_maps_url_override` / `wikipedia_image_url_override`
//     columns, set from the /admin/research review page. When present, they win
//     outright over the derived Maps URL / captured Wikipedia image — see the
//     `mapsUrl` and image-pick lines in both paths below.
//
// v8 changes (2026-07-26) — site_type pass-through:
//   - research_findings gained a nullable `site_type` (Discovery prompt v13):
//     active-church | active-community | other-religious | heritage. The
//     candidate path carries it into sites.type at creation (invalid/missing
//     values become NULL + a warning — never a hold; classification is
//     cosmetic relative to the geographic/dedup gates). proposed_modification
//     path: review-only as ever — the proposed site_type is shown in the diff
//     text alongside the site's current type, but is never auto-applied.
//
// v7 changes (2026-07-26) — image-candidate array + native_name backfill:
//   - The single `wikipedia_image_url` column (v6) is superseded by
//     `wikipedia_image_candidates` (jsonb array of {lang,url} — different-
//     language wikis can carry different lead photos for the same site). Both
//     the candidate and proposed_modification paths now pick one candidate via
//     pickWikipediaImageCandidate (native-language wiki preferred, else English,
//     else first) before importing; imagesImported records the chosen lang. The
//     old wikipedia_image_url column is left in place but no longer read/written.
//   - New best-effort native_name backfill (candidate path only) via Wikidata
//     language links — zero LLM tokens. Fires ONLY when Discovery's own native-
//     language pass left native_name empty; never overwrites it. See
//     backfillNativeNameFromWikidata / COUNTRY_TO_WIKI_LANG.
//
// v6 changes (2026-07-25) — Wikipedia lead-image import + orphan diagnostic:
//   - research_findings gained a nullable `wikipedia_image_url` (Discovery
//     prompt v12). When present, the existing importImageFromUrl() pipeline
//     (lib/imageImport.ts — resolve/fetch/resize/upload + attribution) attaches
//     it as the site's lead image. Candidate path (Part 1): best-effort at
//     creation, non-fatal on failure. proposed_modification path (Part 2): the
//     one narrow auto-apply exception — image inserted directly ONLY when the
//     matched site has zero site_images; the text diff stays review-only.
//     has_no_image is NEVER touched by either path (see the hasNoImage comment).
//   - New read-only Part 3: orphan detection. Surfaces research_findings rows in
//     a dead-end state (status duplicate/excluded/proposed_modification whose
//     referenced name matches no live site) so a row can't silently lose its
//     automated path to `sites` (the Fierbois failure mode). Writes nothing.
//
// v5 changes (2026-07-24):
//   - research_findings gained a `site_id` column: a FK to sites.id (ON UPDATE
//     CASCADE, ON DELETE SET NULL), set here at the moment a net-new site is
//     created. This exists purely as an audit trail — "which research row
//     produced which live site" — for cases where the site's id later changes
//     (a slug rename) or someone wants to trace a site back to the Discovery
//     run and sources that surfaced it. It is NOT used for matching or dedup
//     logic anywhere in this script; it's write-only from here.
//   - Only set on the net-new candidate → site path (step 9/10 below). The
//     proposed_modification path intentionally does NOT set it: that path only
//     ever produces a diff for human review and never writes to `sites`, so
//     stamping a site_id there would claim a change was applied when it wasn't.
//
// v4 changes (2026-07-24), scoped to the geocoding-input path only:
//   - `verified_maps_url` is REMOVED entirely — the column itself has since
//     been dropped from the DB too (it held legacy data from earlier runs;
//     that data was superseded by street_address, see v3). Geocoding is a
//     straight two-tier chain: Google Places (biased by regionCode) →
//     Nominatim, both fed by `buildGeocodeQuery`.
//   - `buildGeocodeQuery` now appends `country` to the query string even when
//     `street_address` is present. It previously only did `name + street_address`,
//     which fed Google Places fine (country arrives separately via the
//     `regionCode` bias parameter) but starved Nominatim, which has no such
//     side-channel and only ever sees the query text itself.
//   - `google_maps_url` fallback chain drops its top tier (verified_maps_url)
//     and now runs: placeId-based URL → street_address-based search URL → ''.
//
// v3 changes (2026-07-24):
//   - research_findings gained an optional `street_address` column (Discovery
//     prompt v10+), captured whenever Step 4 verification turned up a postal
//     address. Superseded by v4 above — see buildGeocodeQuery.
//
// v2 changes (2026-07-24), all scoped to the straight-through (no-human-review)
// path only — the proposed_modification path below is untouched:
//   - native_name, source_links, celebrations now flow through into sites/
//     site_links/site_celebrations instead of being hardcoded null/[]/[].
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

// sites.type values (v8). Matches the DB CHECK constraint — anything else
// would fail the insert, so it's validated (to NULL + warning) before use.
const VALID_SITE_TYPE = new Set(['active-church', 'active-community', 'other-religious', 'heritage']);

export interface MigrationOptions {
  dryRun?: boolean; // default true — caller must explicitly pass false to write
  limit?: number; // default 10 — batch size per invocation (keeps each run under the fn timeout)
  /** Restrict BOTH the candidate and proposed_modification queries to these
   *  research_findings ids. Undefined/empty = no restriction (normal batch
   *  behaviour). Used for targeted re-runs of a specific subset (e.g. a single
   *  subject) without disturbing the created_at-ordered queue for everything
   *  else. Purely additive to the existing status/confidence/import_status
   *  filters — it never widens them. */
  findingIds?: string[];
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
  // v11: candidates no longer get created directly — this stays in the shape
  // for backward compatibility but is never populated anymore. See `queued`.
  created: string[];
  // v11: candidate rows swept into the admin approval queue instead of being
  // created directly — a pending_submissions row (type='site', action='create')
  // per finding, for full review (tags/links/images/coordinates) in Admin →
  // Pending Approvals before anything actually reaches `sites`.
  queued: { findingId: string; submissionId: string }[];
  // v14: Part 1 (candidates) no longer pushes here — duplicate/ambiguous
  // rows are queued with a warning instead of being skipped (see payload.
  // warnings). Still used by Part 2 (proposed_modification)'s two distinct
  // skip cases: no existing_site_name, or no matching site found by name.
  skipped: { id: string; reason: string }[];
  // v14: Part 1 no longer pushes here — nothing is held anymore, everything
  // queues (see the v14 changelog entry above). Kept in the shape for
  // backward compatibility; always empty from this migration now.
  deferred: { id: string; reason: string }[];
  tagsCreated: string[]; // topic tag ids auto-created (or would be, in dry-run)
  proposedUpdates: ProposedUpdate[]; // proposed_modification diffs for human review
  // v6: research_findings rows found in a dead-end state — status is
  // 'duplicate', 'excluded', or 'proposed_modification' but the name doesn't
  // match anything in `sites`, so nothing will ever promote it automatically.
  // Read-only diagnostic; this migration never writes to these rows. See the
  // Discovery prompt v12 fix, which addresses the classification logic that
  // causes this — this is the safety net in case it happens anyway.
  orphaned: { id: string; name: string; status: string; reason: string }[];
  warnings: string[]; // non-fatal: odd interest, reverse-geocode disagreements, etc.
  errors: { id: string; message: string }[];
}

/**
 * Builds the query string handed to the geocoders (Google Places text search
 * and, as a fallback, Nominatim). Prefers `name + street_address + country` — a
 * full postal address — over the old `name + municipality + country`, since the
 * latter is coarse enough to land on the wrong building of the same name in a
 * dense historic centre (the exact failure mode `namesMatch`/proximity dedup
 * exists to catch downstream). Falls back to the coarse form only when
 * Discovery didn't capture a street_address for this row.
 *
 * Prefers `native_name` over `name` as the search term when Discovery captured
 * one (e.g. "Église Saint-Jacques de Compiègne" over "Church of St. James") —
 * both Google Places and Nominatim are keyed off local-language place names,
 * and an English translation of a site name is frequently absent from either
 * index even when the underlying place is well mapped. Falls back to `name`
 * when no native_name is available (e.g. pre-backfill rows).
 *
 * `country` is appended in BOTH branches, even though Google Places also gets
 * it separately via the `regionCode` bias parameter — Nominatim has no such
 * side-channel and only ever sees this query string, so country needs to be
 * in the text itself for that fallback to benefit too.
 */
export function buildGeocodeQuery(f: {
  name: string;
  native_name?: string | null;
  street_address: string | null;
  municipality: string | null;
  country: string | null;
}): string {
  const searchName = f.native_name?.trim() || f.name;
  if (f.street_address) {
    return [searchName, f.street_address, f.country].filter(Boolean).join(', ');
  }
  return [searchName, f.municipality, f.country].filter(Boolean).join(', ');
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
export function importStatusStamp(prefix: string): string {
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

export interface SourceLink {
  url: string;
  link_type: string;
}

export interface CelebrationRow {
  date_label: string;
  description: string;
}

interface ResearchFinding {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  municipality: string | null;
  street_address: string | null;
  interest: string | null;
  tags: string[] | null;
  existing_site_name: string | null;
  current_short_description: string | null;
  change_summary: string | null;
  native_name: string | null;
  source_links: SourceLink[] | null;
  celebrations: CelebrationRow[] | null;
  site_type: string | null;
  google_maps_url_override: string | null;
  confidence: string | null;
  confidence_reason: string | null;
}

export async function runResearchFindingsMigration(
  supabase: SupabaseClient,
  options?: MigrationOptions
): Promise<MigrationResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 10;
  const findingIds = options?.findingIds?.length ? options.findingIds : null;

  const result: MigrationResult = {
    dryRun,
    processed: 0,
    created: [],
    queued: [],
    skipped: [],
    deferred: [],
    tagsCreated: [],
    proposedUpdates: [],
    orphaned: [],
    warnings: [],
    errors: [],
  };

  // ── Batch of net-new candidates, not yet processed ────────────────────────
  // v14 (2026-07-30): no longer gated on confidence='high'. Every candidate
  // now flows through automatically — the gates that used to hold a row back
  // (exact duplicate, ambiguous nearby site, country mismatch) are converted
  // into loud per-row warnings carried in payload.warnings instead of ever
  // blocking insertion. Discovery's own confidence/confidence_reason ride
  // along as a warning too when not 'high', so a reviewer sees why a row
  // wasn't fully trusted without having to go dig in research_findings.
  let candQuery = supabase
    .from('research_findings')
    .select(
      'id,name,description,country,municipality,street_address,interest,tags,existing_site_name,current_short_description,change_summary,native_name,source_links,celebrations,site_type,google_maps_url_override,confidence,confidence_reason'
    )
    .eq('status', 'candidate')
    .is('import_status', null);
  if (findingIds) candQuery = candQuery.in('id', findingIds);
  const { data: candidates, error: candErr } = await candQuery
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
    // Per-row advisory warnings — rides along in payload.warnings so the
    // reviewer (mobile /admin/research or desktop Approvals) sees them right
    // on the card. Mirrored into result.warnings too, for the existing batch
    // summary display, but payload.warnings is the one that actually persists.
    const rowWarnings: string[] = [];
    try {
      if (f.confidence && f.confidence !== 'high') {
        rowWarnings.push(
          `Discovery confidence: ${f.confidence}${f.confidence_reason ? ' — ' + f.confidence_reason : ''}`
        );
      }

      // ── Resolve the Wikipedia link and native_name BEFORE geocoding ──────
      // v15: these used to run near the end, after the geocode step had
      // already happened — which meant buildGeocodeQuery only ever saw
      // whatever native_name Discovery itself captured, and rows where
      // Discovery missed it were geocoded under their English name.
      //
      // That was the single biggest cause of coordinate misses. Nominatim
      // indexes places under their local name; the English translation of a
      // site name frequently isn't in OSM at all. Measured directly against
      // live Nominatim:
      //   "Basilica of Sts. Peter and Paul at Vysehrad, Prague, CZ" → no match
      //   "Bazilika svatého Petra a Pavla, Praha"                   → found
      // Same building. So the backfill has to happen first, and its result
      // has to feed the geocode query.
      let sourceLinks = f.source_links ?? [];
      let wikipediaLink = sourceLinks.find(
        (l) => l.link_type === 'Wikipedia' || /wikipedia\.org/.test(l.url)
      );
      if (!wikipediaLink) {
        try {
          const found = await findWikipediaArticleByTitle(f.native_name || f.name, f.country);
          if (found) {
            wikipediaLink = { url: found.url, link_type: 'Wikipedia' };
            sourceLinks = [...sourceLinks, wikipediaLink];
            rowWarnings.push(
              `No Wikipedia link from Discovery — found "${found.title}" (${found.lang}) by title search, added as a source link; verify it's the right article`
            );
          } else {
            rowWarnings.push('No Wikipedia article found for this site (title search + Discovery both missed)');
          }
        } catch {
          // best-effort only
        }
      }

      // Never overwrites a native_name Discovery already captured — this only
      // fills the gap, and now does so early enough to matter.
      let nativeName = f.native_name ?? null;
      if (!nativeName) {
        try {
          nativeName = await backfillNativeNameFromWikidata(sourceLinks, f.country);
        } catch {
          // best-effort only — a failure here is not worth a warning entry
        }
      }
      if (!nativeName) {
        rowWarnings.push('No native-language name found (Discovery + Wikidata backfill both missed)');
      }

      // Precise when Discovery captured a street_address, coarse otherwise.
      // See buildGeocodeQuery's doc comment for why country is always appended.
      // Feeds it the resolved native_name (above), not just Discovery's.
      const query = buildGeocodeQuery({ ...f, native_name: nativeName });

      // 1. Geocode. Three tiers, in order of trust and cost:
      //    a) Google Places text search, biased with regionCode — free tier.
      //    b) Nominatim forward-geocode — free, rate-limited fallback.
      //    c) An admin-supplied google_maps_url_override's own embedded
      //       coordinates (no network call — see extractCoordsFromMapsUrl),
      //       when both API tiers above miss.
      let lat: number | null = null;
      let lon: number | null = null;
      let placeId: string | null = null;
      // Why each tier produced nothing, so the "no coordinates" warning below
      // can say whether the deployment is misconfigured, an API is failing, or
      // the place genuinely isn't in either index — three very different
      // problems that used to be reported identically.
      let placesNote = '';
      let nominatimNote = '';

      const places = await googlePlacesLookupDetailed(query, f.country);
      if (places.result) {
        lat = places.result.lat;
        lon = places.result.lon;
        placeId = places.result.placeId;
      } else {
        placesNote =
          places.status === 'no-key'
            ? 'Google Places skipped (GOOGLE_PLACES_API_KEY is not configured)'
            : places.status === 'error'
            ? `Google Places failed (${places.detail ?? 'unknown error'})`
            : 'Google Places had no match';

        const fwd = await forwardGeocode(query);
        if (fwd.lat != null && fwd.lon != null) {
          lat = fwd.lat;
          lon = fwd.lon;
        } else {
          nominatimNote = fwd.error
            ? `Nominatim failed (${fwd.error})`
            : 'Nominatim had no match';
        }
      }

      if ((lat == null || lon == null) && f.google_maps_url_override) {
        const urlCoords = extractCoordsFromMapsUrl(f.google_maps_url_override);
        if (urlCoords) {
          lat = urlCoords.lat;
          lon = urlCoords.lon;
        }
      }

      // Coordinates are required to PUBLISH (assertValidCoordinates in
      // lib/createSite.ts enforces that at approval time) but NOT to queue for
      // admin review — the site isn't live until an admin approves it, and
      // SiteForm (used by ApprovalsPanel) already lets the reviewer look up or
      // type in coordinates by hand before approving, exactly like the
      // contribute flow. So a geocoding miss here holds the row for approval
      // instead of dropping it — it no longer silently disappears from every
      // queue just because both free geocoders came up empty.
      const hasCoords = lat != null && lon != null && !(lat === 0 && lon === 0);
      if (!hasCoords) {
        // Include the exact query that was searched — without it a reviewer
        // can't tell a bad search string (the usual cause) from a genuinely
        // unmapped place, and has no idea what to try instead.
        const causes = [placesNote, nominatimNote].filter(Boolean).join('; ');
        const msg =
          `No coordinates found — ${causes || 'no lookup produced a match'}. ` +
          `Searched: "${query}". Set coordinates manually before approving, and check for duplicates by hand ` +
          `(proximity dedup can't run without coordinates).`;
        rowWarnings.push(msg);
        result.warnings.push(`${f.name}: ${msg}`);
      }

      let country = (f.country || '').toUpperCase();
      let municipality = f.municipality || '';
      let region = '';

      if (hasCoords) {
        // 2. Duplicate check (before reverse-geocode to avoid a wasted Nominatim call).
        // A duplicate must be BOTH nearby AND similarly named — proximity alone
        // collapses distinct churches that share a city centre.
        //
        // v14: no longer skips/holds the row — every case below still queues
        // into pending_submissions, just carrying a loud warning instead of
        // silently disappearing (skipped) or getting stuck outside every
        // queue until manually cleared (held). A human reviewing the queued
        // submission decides whether it's really a duplicate.
        const nearby = findNearbySites(lat!, lon!, existingSites ?? []);
        const dup = nearby.find((e) => namesMatch(f.name, e.name ?? ''));
        if (dup) {
          const msg = `Likely duplicate of existing site "${dup.name}" (${dup.id})`;
          rowWarnings.push(msg);
          result.warnings.push(`${f.name}: ${msg}`);
        } else if (nearby.length > 0) {
          // Nearby but differently named — ambiguous rather than a confirmed
          // duplicate. (This is the Sant'Ignazio alla Storta case: Google
          // returned the more famous Campo Marzio church, landing 0m from an
          // existing site under a name that shares no tokens — proximity is
          // the only signal that anything is wrong.)
          const detail = nearby
            .map((e) => `${e.id} @${metresBetween(lat!, lon!, e.latitude!, e.longitude!)}m`)
            .join(', ');
          const msg = `${nearby.length} nearby site(s) with a different name — possible duplicate (${detail})`;
          rowWarnings.push(msg);
          result.warnings.push(`${f.name}: ${msg}`);
        }

        // 3. Reverse-geocode to fill region. Country disagreement is a strong,
        //    unambiguous signal (country boundaries aren't fuzzy the way
        //    municipality strings are) — still just a warning now (v14), same
        //    as municipality disagreement, rather than holding the row.
        const rev = await reverseGeocode(lat!, lon!);
        if (rev.error) {
          // Region is derived solely from this call, so a failure here is why
          // an otherwise-geocoded site lands with a blank region.
          const msg = `Reverse-geocode failed (${rev.error}) — region could not be filled in automatically`;
          rowWarnings.push(msg);
          result.warnings.push(`${f.name}: ${msg}`);
        }
        if (rev.country && f.country && rev.country.toUpperCase() !== f.country.toUpperCase()) {
          const msg = `Country mismatch — candidate said ${f.country}, reverse-geocode says ${rev.country}`;
          rowWarnings.push(msg);
          result.warnings.push(`${f.name}: ${msg}`);
        }
        if (rev.municipality && f.municipality && rev.municipality !== f.municipality) {
          const msg = `Municipality mismatch — candidate said ${f.municipality}, reverse-geocode says ${rev.municipality}`;
          rowWarnings.push(msg);
          result.warnings.push(`${f.name}: reverse-geocoded municipality ${rev.municipality} disagrees with source ${f.municipality}`);
        }
        country = (rev.country || f.country || '').toUpperCase();
        municipality = rev.municipality || f.municipality || '';
        region = rev.region || '';
      }

      // 4. Unique slug, via the shared generateSiteId convention:
      //    {country}-{municipality}-{name}, e.g. it-rome-church-of-the-gesu.
      //    Uses the STORED municipality (reverse-geocoded value wins) so the id
      //    agrees with the row it labels.
      const idBase = generateSiteId(country, municipality, f.name);
      let id = idBase;
      let n = 2;
      while (!id || existingIds.has(id) || assignedThisBatch.has(id)) {
        id = `${idBase}-${n++}`;
      }

      // 5. Tags: resolve refs; auto-create any unknown ref as a topic tag.
      //    ignoreDuplicates makes this safe against concurrent webhook
      //    invocations for sibling rows from the same Discovery run sharing
      //    an as-yet-uncreated tag ref (e.g. two rows both referencing
      //    'augustine-of-hippo', each processed by its own per-row webhook
      //    call) — without it, whichever insert loses the race threw a
      //    tags_pkey unique-violation that aborted the whole row before it
      //    ever reached pending_submissions, silently stalling it forever.
      const tagRefs = (f.tags as string[] | null) ?? [];
      for (const ref of tagRefs) {
        if (knownTagIds.has(ref)) continue;
        if (!dryRun) {
          const { error: tagErr } = await supabase
            .from('tags')
            .upsert({ id: ref, name: titleCaseRef(ref), type: 'topic' }, { ignoreDuplicates: true });
          if (tagErr) throw new Error(`Tag create '${ref}' failed: ${tagErr.message}`);
        }
        knownTagIds.add(ref);
        result.tagsCreated.push(ref);
      }

      // 6. Interest: pass through, flag if non-standard.
      const interest = f.interest || '';
      if (interest && !VALID_INTEREST.has(interest)) {
        const msg = `Non-standard interest '${interest}' passed through`;
        rowWarnings.push(msg);
        result.warnings.push(`${f.name}: ${msg}`);
      }

      // 6b. site_type (v8): validated to NULL rather than passed through —
      //    unlike interest, sites.type has a DB CHECK constraint, so an
      //    unexpected value would fail the whole insert. Missing is fine
      //    (pre-v13 findings have none); the site just lands unclassified.
      let siteType: string | null = f.site_type ?? null;
      if (siteType && !VALID_SITE_TYPE.has(siteType)) {
        const msg = `Invalid site_type '${siteType}' dropped (site created untyped)`;
        rowWarnings.push(msg);
        result.warnings.push(`${f.name}: ${msg}`);
        siteType = null;
      }

      // 6c. Health check that doesn't come from the geocode/dedup chain — no
      // gating, just visibility into how "found" this candidate actually is.
      if (!f.source_links || f.source_links.length === 0) {
        rowWarnings.push('No source links captured by Discovery');
      }

      // 7/8. Build payload + create the site (unless dry-run).
      //    google_maps_url, in order of preference (v5 — dropped the empty-
      //    string fallback: a row with no street_address and no Places match
      //    used to get NO maps url at all, unlike the import-sites/
      //    parallel-status Contribute-page paths, which always degrade to a
      //    plain-text search rather than nothing):
      //      a) a placeId-based URL, when the Places text search matched.
      //      b) a plain search URL built from `query` (the same string that
      //         was searched — native_name-or-name + street_address-or-
      //         municipality + country) when Places didn't match (or has no
      //         API key configured). This is NOT independently confirmed the
      //         way a placeId match is — it's a deterministic URL
      //         construction per Google's documented Maps URL scheme, no API
      //         call involved — but it's a real, specific search rather than
      //         a blank field, and degrades gracefully (the link just fails
      //         to resolve cleanly) rather than silently pointing at the
      //         wrong building the way a bare name-only search can.
      const mapsUrl = f.google_maps_url_override
        ? f.google_maps_url_override
        : placeId
        ? buildMapsSearchUrl(query, placeId)
        : buildMapsSearchUrl(query);
      // (Wikipedia link + native_name are resolved before the geocode step —
      // see the v15 block above.)

      // v11: candidates are swept into the admin approval queue rather than
      // created directly — a pending_submissions row (type='site',
      // action='create'), same shape/destination as the contribute-new-site
      // flow. `id` here is only a suggestion (payload.generated_id); the real
      // id is computed fresh at approval time.
      //
      // v10: resolve (but do not yet upload) a Wikipedia lead image via
      // resolveWikipediaLeadImage (see its doc comment). Passed through as an
      // external-URL image entry; the actual fetch/resize/R2-upload happens
      // later via the SAME importImageFromUrl() pipeline, at actual publish
      // time, exactly like any contributor-submitted external image — never a
      // new upload path, and never touches has_no_image.
      let pickedImageUrl: string | null = null;
      try {
        pickedImageUrl = await resolveWikipediaLeadImage(sourceLinks, country);
      } catch {
        pickedImageUrl = null;
      }
      // v14: related Commons-category images, traced from the same Wikipedia
      // link — additional candidate photos beyond the single lead image.
      let relatedImages: string[] = [];
      if (wikipediaLink) {
        try {
          const imgs = await findWikipediaImages(wikipediaLink.url);
          relatedImages = imgs.relatedImages;
          if (!pickedImageUrl) pickedImageUrl = imgs.leadImage;
        } catch {
          // best-effort only
        }
      }
      if (!pickedImageUrl && relatedImages.length === 0) {
        rowWarnings.push('No images found (Wikipedia lead image or Commons category)');
      }

      const payload = {
        name: f.name,
        native_name: nativeName || null,
        country: (country || '').toUpperCase() || null,
        region: region || null,
        municipality: municipality || null,
        generated_id: id,
        short_description: f.description ?? '',
        latitude: lat,
        longitude: lon,
        google_maps_url: mapsUrl,
        interest: interest || null,
        type: siteType,
        tag_ids: tagRefs,
        links: linksToPayload(toLinkEntries(sourceLinks)),
        celebrations: celebrationsToPayload(toCelebrationEntries(f.celebrations ?? [])),
        images: [
          ...(pickedImageUrl
            ? [{ url: pickedImageUrl, caption: '', attribution: null, storage_type: 'external', display_order: 0 }]
            : []),
          ...relatedImages.slice(0, 5).map((url, i) => ({
            url,
            caption: '',
            attribution: null,
            storage_type: 'external',
            display_order: i + 1,
          })),
        ],
        // v14: advisory warnings surfaced to whoever reviews this submission —
        // duplicate/mismatch signals that used to silently skip or hold the
        // row now ride along here instead. Purely informational; never blocks
        // insertion or approval.
        warnings: rowWarnings,
      };

      if (!dryRun) {
        const { data: submission, error: insertErr } = await supabase
          .from('pending_submissions')
          .insert({ type: 'site', action: 'create', payload, submitted_by: CREATED_BY, status: 'pending' })
          .select('id')
          .single();
        if (insertErr) throw new Error(`Queue insert failed: ${insertErr.message}`);

        // Operational marker only — deliberately does NOT set reviewed/
        // approved/site_id: those track promotion into `sites`, which hasn't
        // happened yet. They get set (if ever) by the eventual approval.
        await supabase
          .from('research_findings')
          .update({ import_status: importStatusStamp('Queued for approval') })
          .eq('id', f.id);

        result.queued.push({ findingId: f.id, submissionId: submission.id });
      } else {
        result.queued.push({ findingId: f.id, submissionId: '(dry run)' });
      }

      existingIds.add(id);
      assignedThisBatch.add(id);
    } catch (err) {
      // Leave import_status untouched so a failed row is retried next run.
      result.errors.push({ id: f.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── Part 2: proposed_modification → a reviewable site-edit submission ────────
  // v15: these used to produce nothing but a diff string in the run result —
  // no review UI anywhere read it, so a proposed change to an existing site
  // was a dead end (the same shape of gap the old site_edits table had).
  //
  // Now each one is queued as a pending_submissions row (type='site',
  // action='edit', site_id set), exactly like a contributor's edit to an
  // existing site, and is reviewed through the same SiteForm in
  // /admin/research. The payload is a FULL snapshot of the site's current
  // state with only the proposed fields overlaid — so approving it applies
  // the proposal and changes nothing else, and the reviewer can see and
  // adjust every field before it goes live.
  let propQuery = supabase
    .from('research_findings')
    .select(
      'id,existing_site_name,current_short_description,change_summary,description,country,site_type,confidence,confidence_reason'
    )
    .eq('status', 'proposed_modification')
    .is('import_status', null);
  if (findingIds) propQuery = propQuery.in('id', findingIds);
  const { data: proposals, error: propErr } = await propQuery
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
        .select(
          'id,name,native_name,country,region,municipality,short_description,latitude,longitude,google_maps_url,interest,type'
        )
        .eq('name', existingName)
        .limit(1)
        .maybeSingle();
      if (!match) {
        // Leave unmarked: the site may be created later, enabling a future match.
        result.skipped.push({ id: p.id, reason: `no site named "${existingName}"` });
        continue;
      }

      // Pull the site's existing relations so the submission carries a
      // complete snapshot. /api/publish-site-edit REPLACES images/links/
      // celebrations/tags wholesale from the payload, so anything omitted
      // here would be silently deleted on approval.
      const [imagesRes, linksRes, celebrationsRes, tagsRes] = await Promise.all([
        supabase
          .from('site_images')
          .select('url,caption,attribution,storage_type,display_order')
          .eq('site_id', match.id)
          .order('display_order'),
        supabase.from('site_links').select('url,link_type,comment').eq('site_id', match.id),
        supabase
          .from('site_celebrations')
          .select('date_label,description,display_order')
          .eq('site_id', match.id)
          .order('display_order'),
        supabase.from('site_tag_assignments').select('tag_id').eq('site_id', match.id),
      ]);

      // Only the fields this proposal actually speaks to are overlaid; every
      // other field stays exactly as the live site has it.
      const proposedDescription = (p.description as string | null)?.trim() || null;
      let proposedType: string | null = (p.site_type as string | null) ?? null;

      const propWarnings: string[] = [];
      if (p.confidence && p.confidence !== 'high') {
        propWarnings.push(
          `Discovery confidence: ${p.confidence}${p.confidence_reason ? ' — ' + p.confidence_reason : ''}`
        );
      }
      propWarnings.push(
        `Proposed change to an existing site: ${(p.change_summary as string | null) ?? '(no summary given)'}`
      );
      if (proposedDescription) {
        propWarnings.push(
          `Description — current: "${match.short_description ?? '(none)'}" → proposed: "${proposedDescription}"`
        );
      }
      if (proposedType && !VALID_SITE_TYPE.has(proposedType)) {
        propWarnings.push(`Proposed site_type '${proposedType}' is invalid — ignored, existing type kept`);
        proposedType = null;
      } else if (proposedType && proposedType !== match.type) {
        propWarnings.push(`Site type — current: '${match.type ?? '(none)'}' → proposed: '${proposedType}'`);
      }

      const editPayload = {
        site_id: match.id,
        name: match.name,
        native_name: match.native_name,
        country: match.country,
        region: match.region,
        municipality: match.municipality,
        short_description: proposedDescription ?? match.short_description ?? '',
        latitude: match.latitude,
        longitude: match.longitude,
        google_maps_url: match.google_maps_url ?? '',
        interest: match.interest,
        type: proposedType ?? match.type,
        tag_ids: (tagsRes.data ?? []).map((t) => t.tag_id as string),
        images: imagesRes.data ?? [],
        links: linksRes.data ?? [],
        celebrations: celebrationsRes.data ?? [],
        warnings: propWarnings,
      };

      const diff =
        `Site "${match.name}" (${match.id})\n` +
        `  change: ${p.change_summary ?? '(no summary)'}\n` +
        `  current:  ${p.current_short_description ?? '(none)'}\n` +
        `  proposed: ${p.description ?? '(none)'}` +
        (proposedType ? `\n  type: current '${match.type ?? '(none)'}' → proposed '${proposedType}'` : '');
      result.proposedUpdates.push({ findingId: p.id, siteId: match.id, siteName: match.name, diff });

      if (!dryRun) {
        const { data: submission, error: insertErr } = await supabase
          .from('pending_submissions')
          .insert({
            type: 'site',
            action: 'edit',
            site_id: match.id,
            payload: editPayload,
            submitted_by: CREATED_BY,
            status: 'pending',
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(`Queue insert failed: ${insertErr.message}`);

        await markStatus(supabase, p.id, importStatusStamp('Queued for approval'));
        result.queued.push({ findingId: p.id, submissionId: submission.id });
      } else {
        result.queued.push({ findingId: p.id, submissionId: '(dry run)' });
      }
    } catch (err) {
      result.errors.push({ id: p.id, message: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── Part 3: orphan detection — read-only, no writes ────────────────────────
  // Surfaces research_findings rows in a dead-end state: status is
  // 'duplicate', 'excluded', or 'proposed_modification', but the name they
  // reference doesn't actually exist in `sites` — meaning nothing will ever
  // promote them automatically. This is the exact failure mode that lost the
  // Fierbois research for weeks (two discovery runs, no candidate row, no
  // automated path to a site). Discovery prompt v12 fixes the classification
  // logic that causes this; this pass is the safety net in case a row slips
  // through anyway, on this run or a prior one.
  const { data: deadEndCandidates, error: deadEndErr } = await supabase
    .from('research_findings')
    .select('id,name,existing_site_name,status')
    .in('status', ['duplicate', 'excluded', 'proposed_modification'])
    .is('import_status', null);
  if (deadEndErr) {
    result.warnings.push(`Orphan check failed to load research_findings: ${deadEndErr.message}`);
  } else {
    const siteNames = new Set((existingSites ?? []).map((s) => s.name.trim().toLowerCase()));
    for (const row of deadEndCandidates ?? []) {
      const targetName = (row.existing_site_name ?? row.name ?? '').trim().toLowerCase();
      if (!targetName || siteNames.has(targetName)) continue; // live, or nothing to check
      result.orphaned.push({
        id: row.id,
        name: row.name,
        status: row.status,
        reason: `status '${row.status}' but no site named "${row.existing_site_name ?? row.name}" exists — this row has no automated path to sites`,
      });
    }
  }

  return result;
}

async function markStatus(supabase: SupabaseClient, id: string, status: string): Promise<void> {
  await supabase.from('research_findings').update({ import_status: status }).eq('id', id);
}
