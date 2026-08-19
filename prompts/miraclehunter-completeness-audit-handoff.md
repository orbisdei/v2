# Orbis Dei — MiracleHunter Completeness Audit: Handoff Prompt

You are continuing an in-progress task for Orbis Dei (orbisdei.org), a database of Catholic and
Christian holy sites. Supabase project ID: `vrnzirtvplbfxepgidhr`. This file is self-contained —
read it fully before doing anything.

## The task

Cross-reference every entry on MiracleHunter.com's Marian apparition approval-listing pages
against what exists in the Orbis Dei database (`sites` + `research_findings` tables), page by
page, and produce one CSV per page.

**Pages in scope:** Vatican Approved, Bishop Approved, Coptic Approved, and the chronological era
pages (`apparitions_0040-0999.html` through `apparitions_1800-1899.html`, plus whatever the site
calls its most recent range — check the nav for the exact current set).

**Explicitly out of scope — do not touch these pages:** Apparitions to Saints, Unapproved
Apparitions, Approved for Faith Expression.

## Status

**Done:** Vatican Approved, Bishop Approved, Coptic Approved, and era pages 0040-0999, 1000-1099,
1100-1199, 1200-1299, 1300-1399, 1400-1499, 1500-1599, 1600-1699, 1700-1799. CSVs for each delivered
to the prompts folder (`miraclehunter-completeness-<page>.csv`). The site's own nav lists exactly ten
era-page ranges ending at 1899 (`40-999` through `1800-1899`), so 1800-1899 is the last era page —
confirm this is still current before starting, in case the site has since added a newer range.

**Remaining, in order:** 1800-1899 (the last era page per the site's own nav as of this pass).

## Deliverable format (exact columns, confirmed with user)

CSV per page, columns: `Page,MiracleHunter Entry,Status,Existing Link,Additional Tags`

- **Page** — the MiracleHunter page name (e.g. "Vatican Approved", "1600-1699")
- **MiracleHunter Entry** — `YEAR - Place (Country)` as MiracleHunter lists it
- **Status** — one of: `Approved, in sites` / `Queued for approval` / `Not previously ingested —
  written as new lead this pass` / `Unvetted lead only — name captured, not yet
  researched/tagged/linked` / `Untraceable` (real, standing, well-documented site, but *this
  specific* apparition claim is uncorroborated/not credibly tied to it — see the Fulda pattern
  under check #3) / `Excluded — no locatable site identified` (the claim has *no* identifiable
  structure, marker, or ruin at all — a different failure mode than Untraceable, don't conflate
  the two) / (era pages only) `No specific site/structure cited by MiracleHunter — not trackable
  as a database site` (MiracleHunter itself names no place, or only a bare country/city with no
  discrete structure — see era-page note below) — plus a free-text parenthetical noting anything
  you changed this pass (e.g. "MiracleHunter source link added this pass — was missing")
- **Existing Link** — the live `https://orbisdei.org/site/<slug>` URL if published; otherwise the
  `research_findings` row reference (`research_findings lead <uuid>` / `research_findings
  candidate <uuid>` / `research_findings excluded <uuid>`)
- **Additional Tags** — any tags beyond `marian-sites` and structural location tags
  (`country-xx`/`municipality-xx`/`region-xx`), comma-separated if more than one. Blank if none.

## Three mandatory checks per entry, regardless of status

1. **Tagged `marian-sites`.**
2. **MiracleHunter source link present**, using the most in-depth link possible — the entry's own
   dedicated `.../approved_apparitions/<slug>/index.html` "More Information" page. **When no
   dedicated subpage exists** (common on the early era pages), per explicit user instruction: still
   add the link, pointed at the relevant category index page (e.g.
   `apparitions_1000-1099.html`). The link is always titled "MiracleHunter". When no dedicated
   subpage exists, add a link comment: `Search "<term>"` where `<term>` is a unique term from
   MiracleHunter's own wording for the place/entry — not any other descriptive phrasing. For
   `research_findings.source_links` (`{url, link_type}` only, no separate note field), fold it into
   `link_type` exactly like that. For published `sites` (via `site_links`, which has a separate
   `comment` column), use `link_type = 'MiracleHunter'` and `comment = 'Search "<term>"'` instead.
   When an entry has its own "More about this apparition" link, fetch that dedicated subpage before
   trusting any prior "too garbled to identify a site" exclusion, and even when there's no prior
   exclusion to check — the dedicated subpage can carry meaningfully more/different detail than the
   summary-table row.
3. **Critical validity check** — lighter pass, escalate only on suspicion (confirmed user
   preference). Don't deep-dive every entry; but if a claim looks generic, thinly sourced, or the
   *site* being credited doesn't actually match the *claim* (e.g. a real, legitimate site that
   just isn't provably the location of the specific apparition/event), flag it. If a tag/status
   correction is clearly warranted, you have permission to make it live.

   **The Fulda pattern:** a real, well-documented site gets credited with a specific apparition
   claim that isn't actually corroborated (either no near-contemporary source documents it, or
   MiracleHunter's own text places the event somewhere else entirely). Resolution, confirmed with
   the user and now settled: there is no `Untraceable` value in the `research_findings.status`
   check constraint, and the user chose not to add one. Instead, reuse `status = 'excluded'` with
   an `exclusion_reason` spelling out the pattern, and remove the `marian-sites` tag. The CSV
   Status column still displays `Untraceable` as the audit-conclusion label even though the
   underlying DB status is `excluded` — that's just the storage mechanism. Apply this directly to
   any future Fulda-pattern hits, no need to re-ask.

   **Finding a place-name match is not the same as validating the claim** — check #3 still applies
   even after checks #1/#2 succeed. Read what the matched site's own legend actually says,
   especially for famous multi-legend shrines, rather than just confirming the place name lines
   up — MiracleHunter's stated date/visionary can conflate two different traditions at the same
   site. For a **published `sites` row** (no status field to record Untraceable on), the
   resolution is: mark the CSV Status `Untraceable` with the explanation, leave the published site
   record itself untouched — the tag/link additions are still valid on the site's own merits, just
   not as validation of this specific claim.

   **Don't confuse either of the above with the separate "no locatable site" pattern** — this
   applies when *no* structure, marker, or ruin can be identified for the claim at all
   (MiracleHunter names only a broad region/city, or a source search turns up nothing), as opposed
   to a real site existing but the claim not being provably tied to it. Label these `Excluded — no
   locatable site identified` in the CSV, distinct from `Untraceable`.

## Net-new entries (nothing in the DB at all)

Write these as `research_findings` leads (`status = 'lead'`). The user's original expectation was
that Vatican/Bishop/Coptic (pages already claimed complete) should turn up very few or none. Era
pages are different — some were "not started" territory before this audit and can legitimately
produce a real volume of net-new leads, especially the thinner/earlier ones. That volume varying a
lot by page is not itself a red flag, but treat every apparent gap as a possible false negative
before writing a new lead — run both dedup traps below first — and surface the net-new count to
the user per page since it can run high.

Before writing a lead, web-verify it's a real, identifiable, named shrine or structure (not just a
generic claim) — don't write speculative leads. If confidence is low (e.g. MiracleHunter names no
discrete structure and independent confirmation is thin), still write the lead but flag the low
confidence explicitly in the CSV parenthetical for user review.

### Handling entries with no locatable place name (era pages only)

Vatican/Bishop/Coptic entries all name a specific site. Era pages often don't: some MiracleHunter
rows give only a visionary's name with no place at all, and others name only a bare country or
city with no discrete structure. Include every row in the CSV regardless (don't silently omit),
but give these a distinct Status — `No specific site/structure cited by MiracleHunter — not
trackable as a database site` — with Existing Link and Additional Tags left blank. Don't write
these as `research_findings` leads; there is nothing locatable to research.

**Important distinction:** having a real, already-published, obviously-relevant site elsewhere in
the DB for that place name is *not* the same as MiracleHunter's own text naming or citing it. The
mandatory MiracleHunter-link check only applies to what MiracleHunter's own entry actually
supports — apply the "no specific site cited" standard based on whether *this* MiracleHunter entry
names a structure or ties the vision to one, independent of what else exists in the DB for that
place. If a real DB site exists but MiracleHunter's text is bare, it's fine to mark the CSV Status
`Approved, in sites` / `Queued for approval` (the site is real regardless) — just don't add a
MiracleHunter link to it on that entry's account.

## Dedup methodology — read before running any query

**Check both `name` AND `municipality`.** `sites.name` holds the dedication name ("Basilica of the
Nativity of the Blessed Virgin Mary"), not the place name — the place name lives in
`sites.municipality`. A `name`-only search will miss real, already-published matches. Check the
equivalent columns in `research_findings` too.

```sql
select 'sites' as tbl, s.id::text, s.name, s.municipality, s.country, ...
from sites s
where s.name ILIKE ANY(ARRAY['%placename%', ...])
   or s.municipality ILIKE ANY(ARRAY['%placename%', ...])
union all
select 'rf' as tbl, id::text, name, municipality, country, status, tags, ...
from research_findings
where name ILIKE ANY(ARRAY['%placename%', ...])
   or municipality ILIKE ANY(ARRAY['%placename%', ...]);
```

Only treat an entry as genuinely net-new if it comes back empty on **both** columns, in **both**
tables. When in doubt, also try the country filter alone (`country = 'XX'`) to catch cases where
neither name nor municipality matches cleanly.

**Also check `run_region`/`run_topic` for prior batch passes.** Prior research batches exist under
`research_findings.run_region = 'MiracleHunter Traditionally Approved <era> AD'` with
`run_topic = 'Marian Sites'` for most era pages so far — i.e. the era-page identifier lives in
`run_region`, not `run_topic`. A name/municipality/country dedup query does **not** reliably
surface this on its own, since a prior researcher may have used a different name for the site than
MiracleHunter's place name, or invented a shorthand not tied to a place at all.

```sql
select id, name, municipality, country, status, tags, exclusion_reason, source_links, created_at
from research_findings
where run_region ILIKE '%<era or page name>%' or run_topic ILIKE '%<era or page name>%';
```

Some pages instead have their prior coverage filed under **generic country-named `run_region`
values** (Italy, Spain, France, Poland, Hungary, Morocco, Greece, etc.) with no
MiracleHunter-page-specific naming at all — apparently from a separate country-by-country batch.
And some real matches are already-published, famous shrines with no MiracleHunter-specific
run_region tag at all. **Check broadly by name/municipality/dedication title across all
run_regions, not just the current page's own, before concluding anything is net-new.**

**Do this run_region/run_topic check for every remaining era page before finalizing net-new
leads** — there is no guarantee prior batches exist for a given page, but if they do, this is the
only reliable way to find them.

### Additional traps to watch for

- **Extraction completeness:** some MiracleHunter pages format entries inconsistently (e.g. not
  every row bolds the year cell the same way). A regex or pattern keyed on one format can silently
  drop real rows. After extracting a page's entry list, do a pass to confirm you haven't missed any
  row before treating the list as complete.
- **Same place name, different site:** when multiple rows share an identical place-name label,
  don't assume they're the same site — read each row's own detail text. MiracleHunter sometimes
  gives two genuinely different shrines the same or nearly-identical place-name label.
- **Stray/bogus dedicated links:** on some pages, one entry's genuine dedicated-subpage link
  bleeds into unrelated later entries in the page's own markup. Don't attach a stray link to an
  entry it doesn't actually belong to — verify the link's content actually matches the entry
  before using it; fall back to category-index + `Search "<term>"` otherwise.
- **Garbled spellings:** MiracleHunter's own text sometimes has typos or place-name corruptions.
  Verify unmatched place names against alternate/corrected spellings, and against MiracleHunter's
  own narrative text (not just the place-name column) before concluding something is net-new — the
  real site name is sometimes only mentioned in the prose, not the header.
- **Cross-page duplicates:** an entry can be a second/later apparition tradition at a site already
  logged on a different era-page CSV, or reference an earlier apparition by name in its own text.
  Check content matches across *all* run_regions and *all* already-completed CSVs, not just the
  current and adjacent era pages — cite the same DB record, no new work needed.
- **Within-page duplicates:** multiple MiracleHunter rows on the same page can describe the same
  physical site/event (recurring visionaries at one shrine, or the same apparition literally
  listed twice). Give each its own CSV row but point them at the same DB record.
- **Missing tags/links on otherwise-real records:** `research_findings` candidates from earlier
  topical passes, and even published `sites`, can be missing the mandatory `marian-sites` tag or
  MiracleHunter link despite being otherwise complete. Add these live — this is in-scope, not
  "finishing someone else's homework." Note: for published `sites`, the MiracleHunter link lives in
  `site_links` (with a separate `comment` column), a different table from `research_findings.
  source_links` — easy to check the wrong one.
- **True duplicate `research_findings` rows** for the same shrine sometimes exist (independent
  research passes creating two rows for one site). Mark the stale one `status = 'duplicate'` with
  an `exclusion_reason` pointing at the surviving row.
- **Bare, untagged `status = 'lead'` placeholders** from an unrelated bulk automated run are
  legitimate but unprocessed — don't partially complete them (don't add tags/links as if finishing
  someone else's homework). Report their status accurately as "Unvetted lead only — name captured,
  not yet researched/tagged/linked" and move on.
- **Nav dropdown vs. page body:** MiracleHunter's "Please select" nav dropdown is a legacy artifact
  that can both omit real entries present in the page body (include those) and retain entries the
  page body has since dropped, often because of a contested/reversed/nullified approval history
  (leave those out, consistent with the out-of-scope pages).

`research_findings.status` valid values: `candidate`, `excluded`, `duplicate`,
`proposed_modification`, `lead`.

## Process notes

- Work **one page at a time** and present the CSV to the user for review before moving to the
  next.
- Save each page's CSV to the user's connected folder (prompts folder) via the file tools, and
  call the file-presentation tool so the user can open it directly.
- All final Claude Code prompts / handoff docs should be `.md` files (standing user preference).
- Ask clarifying questions before doing large batches of new work if anything is ambiguous
  (standing user preference) — but page-by-page execution within the scope already confirmed does
  not need re-confirming each time.

## Immediate next step

1. Fetch `https://www.miraclehunter.com/marian_apparitions/approved_apparitions/apparitions_1800-1899.html`
   fresh. Extract the full entry list carefully (see the extraction-completeness trap above).
2. Run the full 3-check pass against `sites` + `research_findings` (name **and** municipality,
   plus country-only fallback), using the dedup methodology above.
3. Check for prior work under `run_region`/`run_topic`, following the
   `'MiracleHunter Traditionally Approved 1800-1899 AD'` naming convention — and also check other
   run_regions (generic country batches, already-published famous shrines) by content match before
   writing anything as net-new. In practice on 1700-1799, almost every entry already had a
   research_findings row from an earlier generic country-by-country pass (Italy, France,
   Germany/Austria/Switzerland/Belgium, etc.) with no MiracleHunter-page-specific run_region tag at
   all — search broadly by name/municipality first, not just run_region, or you'll miss most of it.
4. Apply the three mandatory checks per entry, watch for a Fulda-pattern or "no locatable site"
   case, and use the place-less-entry Status for anything MiracleHunter doesn't name a site for.
   Watch for all the traps listed above (cross-page and within-page duplicates, missing tags/links
   on real records, stray links, garbled spellings, same-name-different-site). Also watch for
   MiracleHunter entries that don't actually describe a Marian apparition at all (e.g. 1700-1799 had
   a "vision" entry that never mentions the Virgin Mary) — flag those for review rather than silently
   treating them as valid.
5. Save as `miraclehunter-completeness-1800-1899.csv`, present it, and flag the net-new count to
   the user. This is the last era page per the site's nav (confirm before starting) — after it,
   check with the user on whether to also sweep the explicitly-out-of-scope pages or consider the
   audit complete.

## Notes from the 1700-1799 pass (for pattern-matching on 1800-1899)

- Two `research_findings` rows were flipped from `candidate`/`excluded` to `duplicate` when a
  second, redundant row for the same site was found (Mercatello sul Metauro claim vs. the correctly
  identified Veronica Giuliani monastery candidate; a generic-Italy-pass Piné/Montagnaga candidate
  vs. the Bishop-Approved-pass lead for the same site; a pre-publication Aparecida candidate vs. the
  now-published site). Check for this pattern before assuming a "candidate" or "excluded" row is the
  right one to cite — a newer, better-sourced duplicate may exist.
- One row (Divino Amore, Rome) was flipped from `candidate`+`marian-sites` to `excluded` with the
  tag removed, applying the Fulda-pattern convention, because its own sourced description said the
  underlying legend is a miraculous-image protection story, not a personal apparition — even though
  it's a major, legitimate shrine. Apply the same consistency check on 1800-1899: read each
  candidate's own `description`/`exclusion_reason`, not just its name/tags, before citing it.
- One row (Doroszlo/Doroslovo) was promoted from `excluded` to `lead` because it had been excluded
  only for being out of a prior batch's country scope (Hungary vs. present-day Serbia), not on the
  merits. Worth checking whether any 1800-1899 entries hit the same "wrong country batch" dead end.
- Three new `excluded` rows were written for entries with no locatable site (a bare-country name
  with no city, twice, and a named U.S. location — Valley Forge — with no discrete structure and,
  on inspection, no actual Marian apparition described in the source text at all).
