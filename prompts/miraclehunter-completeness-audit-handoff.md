# Orbis Dei — MiracleHunter Completeness Audit: Handoff Prompt

You are continuing an in-progress task for Orbis Dei (orbisdei.org), a database of Catholic and
Christian holy sites. Supabase project ID: `vrnzirtvplbfxepgidhr`. This file is self-contained —
read it fully before doing anything.

## The task

Cross-reference every entry on MiracleHunter.com's Marian apparition approval-listing pages
against what exists in the Orbis Dei database (`sites` + `research_findings` tables), page by
page, and produce one CSV per page.

**Pages in scope:** Vatican Approved, Bishop Approved, Coptic Approved, and the 11 chronological
era pages (`apparitions_0040-0999.html` through `apparitions_1800-1899.html`, plus whatever the
site calls its most recent range — check the nav for the exact current set).

**Explicitly out of scope — do not touch these pages:** Apparitions to Saints, Unapproved
Apparitions, Approved for Faith Expression.

**Status so far:**
- ✅ Vatican Approved — done, CSV delivered: `miraclehunter-completeness-vatican-approved.csv`
- ✅ Bishop Approved — done, CSV delivered: `miraclehunter-completeness-bishop-approved.csv`
- ✅ Coptic Approved — redone fresh per the user's request, CSV overwritten:
  `miraclehunter-completeness-coptic-approved.csv`. The prior CSV had understated several entries
  as bare `status='lead'` placeholders when they'd actually been upgraded to tagged, sourced
  `candidate` rows since — a good reminder that "already done" pages can drift and are worth
  re-checking against current DB state, not just trusted from an old CSV.
- ✅ **40-999 era page** — done, CSV delivered: `miraclehunter-completeness-0040-0999.csv`. Order
  confirmed with user: oldest-first (era pages proceed chronologically).
- ✅ **1000-1099 era page** — done, CSV delivered: `miraclehunter-completeness-1000-1099.csv`.
- ✅ **1100-1199 era page** — done, CSV delivered: `miraclehunter-completeness-1100-1199.csv`. This
  page was a special case: a prior batch pass had *already* fully researched all 34 entries under
  `run_region = 'MiracleHunter Traditionally Approved 1100-1199 AD'` (caught by the mandatory
  run_region/run_topic check — good thing, since without it this would have produced ~30 duplicate
  leads). Net-new leads written this pass: **zero**. Work this pass was limited to backfilling
  missing MiracleHunter source links (~25 `research_findings` rows were missing one), one live fix
  to a published site (Sanctuary of St. Michael the Archangel / Monte Sant'Angelo was missing both
  `marian-sites` and its MiracleHunter link), and upgrading one link from a category-index "Search"
  link to a newly-available dedicated subpage link (Montevergine). Two entries (Arras, Cluny) turned
  out to be **second apparition traditions at sites already logged on the 1000-1099 CSV** — same
  candidate rows, no new work needed. Three entries (Bernard of Clairvaux, Cistercian monks/women,
  Peter Monoculus) all share one `research_findings` row (Abbey of Clairvaux) — one physical site,
  multiple recorded visionary events, one CSV row each.
- ✅ **1200-1299 era page** — done, CSV delivered: `miraclehunter-completeness-1200-1299.csv`. This
  page was almost entirely already researched by a prior batch pass filed under
  `run_region = 'MiracleHunter Traditionally Approved 1200-1299 AD'`, `run_topic = 'Marian Sites'`
  (the same "identifier lives in run_region, not run_topic" convention as 0040-0999 and 1100-1199)
  — caught by the mandatory run_region check before writing anything as net-new. A handful more
  were covered by an even earlier, topically-scoped pass (`run_region` null or a saint's home
  country, `run_topic` a specific saint name like "St. Albertus Magnus" or "St. Dominic") —
  surfaced only via direct name/municipality search, not the run_region check, consistent with the
  1100-1199 pattern. **Net-new leads written this pass: 1** (Paris / Bl. Boniface of Brussels — no
  site named by MiracleHunter, queued for the normal pipeline). Work this pass was otherwise
  backfilling ~30 missing MiracleHunter source links (category-index + `Search "<term>"`, since no
  dedicated subpages exist for any of these), adding the `marian-sites` tag to 3 candidate rows
  that were missing it (Bologna/Jordan of Saxony, Cologne/Albertus Magnus, Apulia/Peter Celestine —
  all from the earlier topical-pass, which didn't reliably apply it), standardizing one live
  published site's MiracleHunter link format (Swieta Lipka Sanctuary — was `link_type = 'Miracle
  Hunter'` with no comment; now `'MiracleHunter'` + `Search "Swieta Lipka"`), and re-marking one
  stale `excluded` row as `duplicate` (Tortosa priest/belt-relic — a garbled retelling of the
  1100-1199 Santa Cinta legend, now pointed at that surviving candidate). **One new Fulda-pattern
  hit:** MiracleHunter's 1220 "Morocco" entry (St. Accursio) had been matched to the Royal
  Monastery of Santa Cruz, Coimbra (real site, houses the Martyrs of Morocco's relics) — but
  MiracleHunter's own text places the apparition in Morocco itself, shortly before Accursio's
  death, and calls the source "unverifiable"; no structure survives there. Applied the standing
  resolution: `status = 'excluded'` with an exclusion_reason spelling out the pattern, `marian-sites`
  tag removed (topical `martyrs-of-morocco` tag kept). Also two same-site, second-apparition-tradition
  pairs cross-referenced within the page itself (Heisterbach: Henry + later Cistercian Monks;
  Villers: lay brother + later Gottardo; Helfta: Matilda of Hackeborn + later Gertrude; Messina:
  Aug 1282 + June 1294) — each pair shares one `research_findings` row, one CSV row each.
- ✅ **1300-1399 era page** — done, CSV delivered: `miraclehunter-completeness-1300-1399.csv`. Same
  story as 1200-1299: nearly the whole page was already covered under
  `run_region = 'MiracleHunter Traditionally Approved 1300-1399 AD'`. **Net-new leads written this
  pass: 0** (all 42 entries matched an existing record). Work was backfilling ~34 missing
  MiracleHunter links, plus several real corrections worth remembering:
  - **Stray-link artifact, new pattern:** this page's markup has a "fiesole/index.html" link
    (the genuine dedicated subpage for the 1328 Andrew Corsini entry) bleeding into several
    unrelated later entries (Bergerac, Estremoz, Cairo, Siena/Bibbiena, Valencia) the same way
    "barcelona/index.html" bled across 1200-1299. Didn't attach the bogus link to any of those;
    gave each its own category-index + `Search "<term>"` link instead.
  - **A dedicated subpage overturned a bad exclusion:** the "1326 Asti (Bishop Guido)" row had
    been excluded as "too garbled to identify a site" — but MiracleHunter's own "More about this
    apparition" link (`ivrea/index.html`) was sitting right there unused, and it reveals this is
    the *same* Belmonte/King Arduino tradition already researched (and already excluded, for a
    better reason — Belmonte itself unconfirmable independently, unlike the Turin/Consolata
    component) from the 1000-1099 page. Corrected the exclusion_reason and added the real link.
    **Lesson: when an entry has its own "More about this apparition" link, always fetch it before
    trusting a prior "too garbled" exclusion** — the summary-table text and the dedicated subpage
    can differ substantially.
  - **A different-era run_region held the real site:** "1310 Bergamo (Madonna del Castagno)" had
    been excluded on this page's own pass ("no specific site named"), but a real, named candidate
    for the exact same shrine title existed under `run_region = 'MiracleHunter Traditionally
    Approved 1500-1599 AD'` (MiracleHunter apparently lists a second apparition there too). Used
    the real candidate, marked the stale exclusion `duplicate` pointing at it. **Broadens the
    dedup-trap lesson: check content matches across *all* run_regions, not just the current and
    immediately-adjacent era pages.**
  - **Cross-page candidate found by name only:** "1363 Mariazell" cross-references the 1157
    Mariazell apparition by name in MiracleHunter's own text; matched to the existing
    `run_region = null` / topical-pass candidate already carrying an 1100-1199 MiracleHunter link
    — same pattern as Tortosa on 1200-1299.
  - **A live published site was missing its MiracleHunter link entirely:** "1325 Montserrat"
    matches the already-published Holy Cave of Montserrat site, which had two other source links
    but no MiracleHunter link at all — added one. Confirmed this 1325 "captive son" narrative is a
    coherent, distinct tradition from the 1025 founding-date conflation flagged Untraceable on the
    1000-1099 CSV (no Fulda-pattern issue here).
- ✅ **1400-1499 era page** — done, CSV delivered: `miraclehunter-completeness-1400-1499.csv`. Unlike
  every prior era page, this one was **not** filed under a `MiracleHunter Traditionally Approved
  1400-1499 AD` run_region (that convention was empty for this page) — instead, almost the entire
  page turned out to already be researched under generic country-named `run_region` values (Italy,
  Spain, France, Poland, Hungary, Netherlands, Morocco, Greece, "Germany, Austria, Switzerland &
  Belgium", etc.) with `run_topic = 'Marian Sites'`, from what looks like a broad country-by-country
  batch pass done 2026-08-05 through 2026-08-09 — not tied to any MiracleHunter-page naming
  convention at all. A plain name/municipality ILIKE sweep still caught nearly all of it, but several
  needed garbled-spelling or title-based lookups (MiracleHunter's own text has real typos/corruptions:
  "Raccogni" → Racconigi; "Matraverebély-Szentkist" → Mátraverebély-Szentkút; "Albendorf" → Wambierzyce
  — the last of which was *also* a cross-page duplicate of MiracleHunter's own 1200-1299 "Albendorf"
  listing, already candidate-tagged with an MH link from a prior pass). **Net-new leads written this
  pass: 3** (Monteortone, Saronno, and Sasso/Pontassieve — all real, independently-confirmed shrines
  MiracleHunter names candidly but that had no DB row at all; written as full tagged `candidate` rows
  with sources rather than bare `lead` rows, since the research was already done to confirm them,
  consistent with the quality bar of the rest of this page's sibling records). Work this pass was
  otherwise near-total backfilling: **~58 rows were missing their mandatory MiracleHunter source
  link** (the pre-existing batch pass had populated Wikipedia/official-site/tourism-board links but
  never a MiracleHunter one), plus 5 rows missing the `marian-sites` tag entirely (Casal Santa Maria,
  Fez, Madrid/Beatrice-of-Silva, Paris/Alain-de-la-Roche, Azagna — all excluded rows that had been
  tagged `{}` instead). Three published sites (the Domremy/Joan-of-Arc trio — Basilica of Bois-Chenu,
  Church of St. Rémy, Birthplace House) were live with real source links but **no MiracleHunter link
  in `site_links`** at all — added via `site_links` insert, not `source_links`. **Within-page
  duplicates found:** the Nov 1470 "Badia di Cava," Nov 1485 "Cava," and April 1490 "Cava de'
  Tirreni" entries are all the same Gabriele Cinnamo / Sanctuary of Maria SS. Avvocata tradition (the
  prior pass had already cross-referenced this correctly via `exclusion_reason` on two of the three,
  pointing at the third, which carries the real `candidate` record); the two undated/ca.1450
  "Betharram" listings are the same site; the 1490 "Alaexos, Castiglia" and undated "Alexos, Castile"
  listings are the same Hermitage of the Casita, Alaejos; and the 1496 "Azagna" entry (Bl. Juana de la
  Cruz's birthplace, no structure there) shares its visionary and site with the 1449 "Cubas de la
  Sagra" / "Madrid" entries (her later convent) — all handled the established way, one CSV row each,
  same DB record. **One "no specific site" case:** the 1417 Siena/St. Bernardino entry names no
  structure, only the city — used the era-page-only status per convention. No Fulda-pattern hits
  found on this page (the closest near-miss, 1438 Bologna's siege-deliverance claim, names no site at
  all in MiracleHunter's own text, so it was classed as plain "no locatable site" rather than Fulda,
  per the distinction in the methodology section).

  **⚠️ Correction made after user review:** the 1424 Domremy/Joan-of-Arc entry was initially marked
  "Approved, in sites" with a MiracleHunter link added to all three related published sites (Basilica
  of Bois-Chenu, Church of St. Rémy, Birthplace House). That link was wrong and has been retracted
  (`site_links` rows deleted). MiracleHunter's own text for this entry is pure biography — "Domremy
  (France)" as the place-name column value, then a narrative about her voices, Chinon, Reims, Rouen,
  and canonization that never names or even re-mentions a structure. That's the same situation as the
  1417 Siena/Bernardino entry, which correctly got "No specific site/structure cited by MiracleHunter"
  with blank links — Domremy should have gotten the same treatment on the link, even though (unlike
  Siena) real, well-documented published sites already exist there from an unrelated Joan-of-Arc
  topical pass. **Lesson: having a real, already-published, obviously-relevant site is not the same
  as MiracleHunter's own text naming or citing it.** The mandatory MiracleHunter-link check (#2) only
  applies to what MiracleHunter's own entry actually supports — a place-name match to a real result
  elsewhere in the DB doesn't retroactively justify inventing a citation MiracleHunter's text doesn't
  make. Apply the "No specific site/structure cited" standard on its own merits (does *this* MH entry
  name a structure or tie the vision to one?), independent of whether the DB already happens to have
  a well-populated real site for that place. When a real DB site exists but the MH text itself is
  bare, it's fine to still mark the CSV Status "Approved, in sites" / "Queued for approval" (the site
  itself is real and doesn't need MiracleHunter's endorsement to exist) — just don't add a
  MiracleHunter link to it on this entry's account.
- ⬜ 4 remaining era pages, next up: **1500-1599**, then
  1600-1699, 1700-1799, 1800-1899, and whatever the site calls its current
  final range (check the nav for the exact set — see note above).

## Deliverable format (exact columns, confirmed with user)

CSV per page, columns: `Page,MiracleHunter Entry,Status,Existing Link,Additional Tags`

- **Page** — the MiracleHunter page name (e.g. "Vatican Approved", "40-999")
- **MiracleHunter Entry** — `YEAR - Place (Country)` as MiracleHunter lists it
- **Status** — one of: `Approved, in sites` / `Queued for approval` / `Not previously ingested —
  written as new lead this pass` / `Unvetted lead only — name captured, not yet
  researched/tagged/linked` / `Untraceable` (real, standing, well-documented site, but *this
  specific* apparition claim is uncorroborated/not credibly tied to it — the Fulda pattern, see
  below) / `Excluded — no locatable site identified` (the claim has *no* identifiable structure,
  marker, or ruin at all — a different failure mode than Untraceable, don't conflate the two) /
  (era pages only) `No specific site/structure cited by MiracleHunter — not trackable as a
  database site` (MiracleHunter itself names no place, or only a bare country/city with no
  discrete structure — see era-page note below) — plus a free-text parenthetical noting anything
  you changed this pass (e.g. "MiracleHunter source link added this pass — was missing")
- **Existing Link** — the live `https://orbisdei.org/site/<slug>` URL if published; otherwise the
  `research_findings` row reference (`research_findings lead <uuid>` / `research_findings
  candidate <uuid>`)
- **Additional Tags** — any tags beyond `marian-sites` and structural location tags
  (`country-xx`/`municipality-xx`/`region-xx`), comma-separated if more than one. Blank if none.

## Three mandatory checks per entry, regardless of status

1. **Tagged `marian-sites`.**
2. **MiracleHunter source link present**, using the most in-depth link possible — the entry's own
   dedicated `.../approved_apparitions/<slug>/index.html` "More Information" page. **When no
   dedicated subpage exists** (common on the early era pages), per explicit user instruction: still
   add the link, pointed at the relevant category index page (e.g.
   `apparitions_1000-1099.html`). The link is always titled "MiracleHunter".  When no dedicated
   subpage exists, add a link comment: `Search "<term>"` where `<term>` is a unique term from
   MiracleHunter's own wording for the place/entry — not any other descriptive phrasing. For
   `research_findings.source_links` (`{url, link_type}` only, no separate note field), fold it into
   `link_type` exactly like that. For published `sites` (via `site_links`, which has a separate
   `comment` column), use `link_type = 'MiracleHunter'` and `comment = 'Search "<term>"'` instead.
3. **Critical validity check** — lighter pass, escalate only on suspicion (confirmed user
   preference). Don't deep-dive every entry; but if a claim looks generic, thinly sourced, or the
   *site* being credited doesn't actually match the *claim* (e.g. a real, legitimate site that
   just isn't provably the location of the specific apparition/event), flag it. If a tag/status
   correction is clearly warranted, you have permission to make it live — this is the precedent
   the user set with the Fulda Cathedral / St. Boniface case (real site, unprovable specific
   claim → remove `marian-sites` tag, mark it `Untraceable`).

   **✅ RESOLVED (found on the 0040-0999 page, as predicted):** MiracleHunter's 754 A.D. "Mainz"
   entry (St. Boniface, oak-tree icon apparition) maps to the `research_findings` row `Fulda
   Cathedral` (id `a37a1765-c188-4d14-b832-22c5c90b5253`). Confirmed the pattern: real,
   well-documented site (Boniface's burial site, Germany's foremost Bonifatian pilgrimage
   destination) but the specific claim is uncorroborated by near-contemporary sources, and
   MiracleHunter itself places the event at "Mainz," not Fulda. **DB representation, decided with
   the user:** there is no formal `Untraceable` value in the `research_findings.status` check
   constraint, and the user chose *not* to add one. Instead: **reuse `status = 'excluded'` with an
   `exclusion_reason` spelling out the Untraceable pattern**, and remove the `marian-sites` tag.
   The CSV Status column still says `Untraceable` (that's the audit-conclusion label for the
   reader) even though the underlying DB status is `excluded` — that's just the storage mechanism.
   Apply this same resolution directly (no need to re-ask) for any future Fulda-pattern hits.

   **Finding a place-name match is not the same as validating the claim — check #3 still applies
   even after check #1/#2 succeed.** On 1000-1099, "1025 - Montserrat (Spain) - Visionary: A
   mother" was matched by place name to the published Holy Cave of Montserrat site and marked
   "Approved, in sites" without checking whether that specific claim was real. It wasn't: 1025 is
   the year the Abbey was *founded* (by Abbot Oliba), not an apparition date — no source documents
   a vision that year or names a "mother" visionary; the site's actual documented legend is
   shepherds finding the statue in 880 CE. MiracleHunter's entry conflates the two. Caught only
   because the user pushed back on a Montserrat DB question and the mismatch surfaced under
   scrutiny — a reminder to actually read what the matched site's own legend says before crediting
   it, especially for famous multi-legend shrines, not just confirm the place name lines up.
   **Published `sites` have no status field**, so there's no DB place to record "Untraceable" the
   way `research_findings.status='excluded'` works — resolution for this case: mark the CSV Status
   `Untraceable` with the explanation, leave the published site record itself untouched (the tag/
   link additions were still valid on the site's own merits, just not on this specific claim's).

   **Don't confuse either of the above with the separate "no locatable site" pattern**, which showed up
   repeatedly in `research_findings` rows already excluded by prior research passes (Savoy/St.
   Marino, Toulouse/Gondesalve, Reims/Fr. Gerhard, Cologne/Hermann von Bonn, Caesarea/St. Basil —
   all on 0040-0999). Those are excluded because *no* structure, marker, or ruin can be identified
   for the claim at all (MiracleHunter names only a broad region/city, or a source search turns up
   nothing) — not because a real site exists but the claim isn't provably tied to it. Label these
   `Excluded — no locatable site identified` in the CSV, distinct from `Untraceable`.

## Net-new entries (nothing in the DB at all)

Write these as `research_findings` leads (`status = 'lead'`). The user's expectation, stated
explicitly: **"There'd better be very few or none of those — this was already supposed to have
been completed."** Treat every apparent gap as a possible false negative before writing a new
lead — see the critical methodology note below (and the `run_region` dedup trap especially).

**Caveat learned on 0040-0999:** the "very few or none" expectation was about pages already
claimed complete (Vatican/Bishop/Coptic). The era pages were explicitly "not started" territory,
and the earliest ones in particular (40-999) are mostly thin, single-line legendary
material MiracleHunter itself never built dedicated subpages for — 0040-0999 alone produced 25
genuinely net-new leads (after the `run_region` dedup catch removed 2 false positives) plus 2 new
`excluded`/`Untraceable`-pattern records, out of 70 entries. That volume is expected to vary
a lot by era page and is not itself a red flag — but the `run_region` check above is mandatory
before trusting a "net-new" count, and it's worth surfacing the count to the user per page since it
can run high.

### Handling entries with no locatable place name (era pages only)

Vatican/Bishop/Coptic entries all name a specific site. Era pages — especially the earliest ones —
often don't: some MiracleHunter rows give only a visionary's name with no place at all (e.g. "530 -
Visionary: St. Dosithée"), and others name only a bare country or city with no discrete structure
(e.g. "India," "Rome" with no church specified). Decided with the user: **include every row in the
CSV regardless** (don't silently omit), but give these a distinct Status —
`No specific site/structure cited by MiracleHunter — not trackable as a database site` — with
Existing Link and Additional Tags left blank. Don't write these as `research_findings` leads; there
is nothing locatable to research. Apply this consistently across all remaining era pages.

## ⚠️ Critical methodology note — read before running any dedup query

On the Vatican Approved page, two entries (Siluva, Lithuania and Filippsdorf, Czech Republic)
were wrongly written as new leads because the dedup search only checked `sites.name ILIKE
'%placename%'`. That failed because `sites.name` holds the **dedication name** ("Basilica of the
Nativity of the Blessed Virgin Mary"), not the place name — the place name lives in
`sites.municipality`. Both sites were already fully published, tagged, and linked; the erroneous
lead rows had to be deleted and the CSV corrected after the user caught it.

**Every dedup query from here on must check both `name` AND `municipality`** (and the equivalent
in `research_findings`), e.g.:

```sql
select 'sites' as tbl, s.id::text, s.name, s.municipality, s.country, ...
from sites s
where s.name ILIKE ANY(ARRAY['%placename%', ...])
   or s.municipality ILIKE ANY(ARRAY['%placename%', ...])
union all
select 'rf' as tbl, id::text, name, municipality, country, status, import_status, tags, ...
from research_findings
where name ILIKE ANY(ARRAY['%placename%', ...])
   or municipality ILIKE ANY(ARRAY['%placename%', ...]);
```

Only treat an entry as genuinely net-new if it comes back empty on **both** columns, in **both**
tables. When in doubt, also try the country filter alone (`country = 'XX'`) to catch cases where
neither name nor municipality matches cleanly (this is what caught all 7 Coptic entries cleanly).

### ⚠️⚠️ Second dedup trap found on 0040-0999 — check `run_region`, not just `run_topic`

On the 0040-0999 page, 27 entries were initially written as new leads. The user pushed back — a
prior pass had *already* dissected this exact page and reaudited it. That prior work was real and
findable, but it was filed under **`research_findings.run_region = 'MiracleHunter Traditionally
Approved 40-999 AD'`** with **`run_topic = 'Marian Sites'`** — i.e. the era-page identifier lives
in `run_region`, and `run_topic` is a generic label, which is the *opposite* convention from what
this current audit pass uses (`run_topic = 'MiracleHunter completeness audit — <era> era page'`).
A name/municipality/country dedup query does **not** surface this on its own if the prior
researcher used a different name for the site than MiracleHunter's place name (e.g. MiracleHunter
says "Sion Les Saintos," the DB candidate is named "Basilica of Our Lady of Sion, Saxon-Sion" —
matched only by content, not string overlap) or invented a shorthand name not tied to a place at
all — so it's easy to independently (re-)research something already covered.

**Before writing any lead as net-new, also run:**

```sql
select id, name, municipality, country, status, tags, exclusion_reason, source_links, created_at
from research_findings
where run_region ILIKE '%<era or page name>%' or run_topic ILIKE '%<era or page name>%';
```

Checking this log on 0040-0999 caught 2 erroneous duplicate leads out of the 27 I'd written
(Behuard, and the "Sion Les Saintos" entry — which I'd also mis-resolved to the wrong modern place,
"Toul," before finding the correct prior match). Both were fixed: the duplicate lead rows marked
`status = 'duplicate'` with an `exclusion_reason` pointing at the surviving candidate row, and the
CSV corrected to point at the real candidate instead. **Do this log check for every remaining era
page before finalizing net-new leads** — there is no guarantee prior batches exist for a given
page, but if they do, this is the only way to find them reliably.

## Other things learned so far (apply going forward)

- **MiracleHunter's own page body is more reliable than its nav dropdown.** The nav "Please
  select" list is a legacy artifact — it can both omit real entries that are in the page body
  (Lezajsk on Vatican, Montagnaga on Bishop, Gabal Dronka on Coptic all appeared in-body but not
  in the dropdown — these are real, include them) and retain entries the page body has since
  dropped (Amsterdam and Lipa were in the Bishop Approved dropdown but not the body — both have
  contested/reversed/nullified approval histories per their own dedicated MiracleHunter pages, so
  their absence from the body looks like a deliberate correction, not a scrape gap — leave them
  out, consistent with excluding Faith Expression / Unapproved scope anyway).
- **Some `research_findings` rows are bare, untagged `status = 'lead'` placeholders** from an
  unrelated bulk automated run (many created at the same timestamp, `2026-08-09 17:09:44`, across
  many different countries/topics — Alsace, Bolivia, Egypt, Venezuela, Nicaragua, Argentina,
  Japan, etc.). These are legitimate — they're queued for the normal Prompt-2 verify/stage
  pipeline, just not processed yet. **Don't partially complete them** (don't add tags/links to a
  bare lead as if finishing someone else's homework) — report their status accurately as
  "Unvetted lead only — name captured, not yet researched/tagged/linked" and move on.
- **Do add a missing MiracleHunter link to `research_findings` rows that are otherwise real,
  tagged `candidate`/`proposed_modification` rows** — that's an in-scope fix per the two mandatory
  checks above, distinct from the bare-placeholder case.
- **Clean up true duplicate `research_findings` rows** when you find them (e.g. Champion, WI had
  two rows for the same site — one that progressed into `pending_submissions` for admin review,
  and a stale leftover). Mark the stale one `status = 'duplicate'` with an `exclusion_reason`
  pointing at the surviving row.
- `research_findings.status` valid values: `candidate`, `excluded`, `duplicate`,
  `proposed_modification`, `lead` (added specifically to support this kind of standalone-lead
  workflow — see `orbisdei-verify-stage-prompt.MD` for the full design). **`Untraceable` is not a
  DB status value and the user chose not to add one** — represent it as `status = 'excluded'` with
  an `exclusion_reason` explaining the Untraceable pattern (real site, unprovable specific claim);
  the CSV Status column still displays `Untraceable` as the audit-conclusion label. See the
  resolved Fulda case above for the template. This is now settled — no need to re-ask.

## Process notes

- Work **one page at a time** and present the CSV to the user for review before moving to the
  next — this was explicitly requested ("I recommend we do this one page at a time because it
  will take quite a while").
- Save each page's CSV to the user's connected folder (prompts folder) via the file tools, and
  call the file-presentation tool so the user can open it directly.
- All final Claude Code prompts / handoff docs should be `.md` files (standing user preference).
- Ask clarifying questions before doing large batches of new work if anything is ambiguous
  (standing user preference) — but page-by-page execution within the scope already confirmed does
  not need re-confirming each time.

## Immediate next step

1. Fetch `https://www.miraclehunter.com/marian_apparitions/approved_apparitions/apparitions_1500-1599.html`
   fresh.
2. Run the full 3-check pass against `sites` + `research_findings` (name **and** municipality,
   plus country-only fallback), using the corrected dedup methodology above.
3. **Also check for prior work under `run_region`/`run_topic`** — search
   `run_region ILIKE '%1500-1599%'` or `run_topic ILIKE '%1500-1599%'`. Unlike 1400-1499, there
   **is** a large pre-existing batch under `run_region = 'MiracleHunter Traditionally Approved
   1500-1599 AD'` / `run_topic = 'Marian Sites'` (111 rows as of this writing) — start there. Some
   of those 111 rows are confirmed to be *this* page's real content (e.g. Ancona/young Capuchin
   novice, Brescia/Giacomo Ledesma, Cordoba/Our Lady of the Font, Faenza/Alexander of Butrium — all
   already `excluded` with reasons on file), so this page may be close to fully pre-researched too.
   **Don't assume the coverage is total** — 1400-1499 looked similarly pre-covered but still had 3
   genuine gaps (Monteortone, Saronno, Sasso) that only turned up via targeted web search after the
   DB sweep came up empty, and MiracleHunter's own spelling is sometimes garbled (verify unmatched
   place names against alternate/corrected spellings before concluding something is net-new).
   **Also check *other* run_regions by content match** (not just 1500-1599's own) — the
   1400-1499 pass found real matches sitting under generic country-named run_regions (Italy, Spain,
   France, Poland, Hungary, Morocco, Greece, "Germany, Austria, Switzerland & Belgium") with no
   MiracleHunter-page naming convention at all, apparently from a separate country-by-country batch
   done 2026-08-05 through 2026-08-09 — check those broadly by name/municipality before writing
   anything as net-new.
4. Apply the three mandatory checks per entry, watch for another Fulda-pattern or "no locatable
   site" case, and use the place-less-entry Status for anything MiracleHunter doesn't name a site
   for. Also watch for: (a) entries that are a second/later apparition tradition at a site already
   logged on an earlier era-page CSV (same candidate row, no new work, just note the cross-page
   duplication — see Arras/Cluny on 1100-1199, Tortosa/Mariazell on 1200-1299/1300-1399, and
   Albendorf on 1400-1499, which cross-referenced MiracleHunter's *own* 1200-1299 "Albendorf"
   listing), (b) multiple MiracleHunter entries that share one physical site/one `research_findings`
   row *within the same page* — give each its own CSV row but point them at the same DB record (on
   1400-1499: the Nov1470/Nov1485/Apr1490 "Cava"/Avvocata trio, the two Betharram listings, and the
   two Alaejos/Casita listings), (c) `research_findings` rows that are missing the mandatory
   `marian-sites` tag even though they're otherwise real, tagged candidates from an earlier topical
   pass — add it live (5 more found on 1400-1499), (d) **published `sites` missing a MiracleHunter
   link in `site_links`** even when their `research_findings` counterpart has other sources — this
   is a *separate table* from `source_links` and easy to miss (caught on the Domremy/Joan-of-Arc
   trio this pass), and (e) **stray/bogus links**: 1200-1299 ("barcelona/index.html") and 1300-1399
   ("fiesole/index.html") both had one entry's genuine dedicated-subpage link bleed into unrelated
   later entries in the page's own markup — don't attach a stray link to an entry it doesn't
   actually belong to; use category-index + `Search "<term>"` instead. **And when an entry has its
   own "More about this apparition" link, fetch that dedicated subpage before trusting any prior
   "too garbled to identify a site" exclusion.**
5. Save as `miraclehunter-completeness-1500-1599.csv`, present it, and flag the net-new count to
   the user before moving to 1600-1699.
6. Continue through the remaining era pages in order:
   1600-1699, 1700-1799, 1800-1899, then whatever the site's current final range is.
