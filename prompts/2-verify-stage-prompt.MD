# Orbis Dei — Prompt 2: Verify & Stage
## Version 1

---

## ENTRY POINTS

Every run through this file starts at exactly one of these two entry points. Everything from **Step 3** onward is identical regardless of which one you came in through.

### Entry Point A — Chained from Prompt 1 (Discovery)

You arrive here with, from Prompt 1's Handoff section:

- **Topic** and **Region** for this run
- The **`research_backlog` row `id`** selected in Prompt 1's Step 0
- A **candidate list**, each with a working name, the specific claim that makes it plausible, source URLs already consulted, and a native-language name if one was found

Proceed directly to Step 3 below, processing every candidate in the list. At the end of this run, Database Interaction's `research_backlog` bookkeeping applies (see below) — this run is expected to close out that row.

### Entry Point B — Standalone, against queued leads

Use this when you already have one or more specific site names worth checking and do **not** want a broader topic/region search run at all — e.g. a curator already knows of two candidate sites in a region and just wants those two resolved. No Discovery sweep happens, and no `research_backlog` row is read or written for this run.

Pull the open leads to resolve:

```sql
SELECT id, name, run_topic, run_region, country, municipality, description,
       source_links, native_name, street_address, site_type, tags,
       confidence, confidence_reason
FROM research_findings
WHERE status = 'lead'
  -- add whatever scoping the invocation actually asked for, e.g.:
  -- AND run_region ILIKE '%alsace%'
  -- AND id = ANY('[specific uuids]'::uuid[])
ORDER BY run_topic, created_at ASC
LIMIT [batch cap, extended to finish a split topic — see "Processing multiple leads" below];
```

Ordering by `run_topic` first (not just `created_at`) is deliberate: it clusters same-topic leads together in the result set, which is what makes the topic-boundary rule and the shared-source check below possible.

Each returned row already has a working `name` and whatever context was captured when the lead was queued (see Step 5 below for how leads get created going forward, or a curator may have inserted one directly by hand — same shape either way). Treat each row exactly like an Entry-Point-A candidate from here on, with one difference: **resolving a lead means `UPDATE`-ing that same `research_findings` row in place, never `INSERT`-ing a new one** — see Database Interaction below.

### Processing multiple leads or candidates in one run

Whichever entry point you came in through, if there is more than one candidate/lead to process, **handle all of them in this single continuous run** — load this prompt's rules once, then loop through Steps 3–5 and Output Fields per site, rather than starting a fresh invocation per site. The Qualification Filter, Interest Tier, Site Type decision order, Output Fields, Name Formatting, and Tagging rules below are fixed overhead paid once regardless of how many sites you process; re-paying that cost per site — separate invocations, or fanning out to parallel subagents — multiplies token spend for no benefit (parallelizing here buys latency, not tokens, since each branch still has to load the full ruleset independently). When multiple candidates share a topic or region, also run Database Interaction's existing-inventory and tag-lookup queries once for the whole group rather than once per site.

That said, batch the *instructions*, not the *judgment*: Step 4's verification and the Qualification Filter/Interest Tier/Site Type classification must stay genuinely independent reasoning per site even inside one shared run — do not let one candidate's sourcing or confidence bleed into another's. Cap a single run at roughly 15 leads/candidates; if more are open, resolve the remainder in a follow-up run rather than degrading judgment quality by overloading one context.

**Don't split a topic across runs for a small overage.** Because the pull query orders by `run_topic`, leads sharing a topic land together in the result set. If the cap would otherwise cut a topic in half — e.g. rows 15 and 16 are both "St. Hildegard of Bingen" — extend that run far enough to finish the topic (up to roughly 20 total) rather than stranding one or two leads for a follow-up run that has to re-pay the dedup sweep, tag lookup, and any shared Step 4 source for that topic from scratch. Don't chain this past a second topic's worth of overflow — if finishing the current topic *and* starting the next would both land in one run, stop at the topic boundary instead and leave the next topic for its own run.

**Check for a shared authoritative source before searching per-site.** When a batch clusters multiple leads under the same topic, a single overview or "trail" source often independently confirms several of them at once — a religious order's own page listing its houses, a diocesan or heritage-authority page enumerating a saint's known sites, a regional tourism board's page on a pilgrimage circuit, etc. Look for one of these before running a separate Step 4 search per site under that topic; it still counts as an independent source for each site it actually confirms, and cuts the search count for the cluster.

---

## STEPS 1 & 2

Not relevant here

---

## STEP 3 — DEDUPLICATION

**Matching by name alone is never sufficient** to route a candidate to `duplicates` or to fold it into an existing row — the same devotional title gets reused at unrelated shrines worldwide (Our Lady of Monserrate/Monserrat, St. Paul's, St. Xavier's, Bom Jesus are all real examples already in this database). A name match must be corroborated by matching `country` — or, if country isn't a clean signal (a saint venerated across a border region, say), an actual documented connection between the two candidates — before you treat them as the same site. **This check applies to renames too:** if you're adjusting a site's `name` per the Name Formatting rules below, re-run this check afterward — a rename can accidentally increase similarity to an unrelated site's name where none existed before (this is exactly how "Minor Basilica of the Virgin of Monserrat" in Ecuador nearly collided with the pre-existing "Minor Basilica of Our Lady of Monserrate" in Puerto Rico).

Three different things can match a candidate, and they're handled differently.

**Against the `sites` table (published inventory):** If the same site appears under multiple names or titles (e.g. "Cimbres Marian Apparition" and "Our Lady of Graces of Cimbres"), merge them into one entry using the most complete name. When a candidate matches a site already in the existing inventory (see Database Interaction below), do not simply drop it — compare your freshly researched `description` against that site's current `short_description` in the `sites` table (fetched in the same query). If your research surfaces meaningfully new information not already reflected in the existing text (a new date, relic, source, corrected detail, additional documented connection, etc.), route it to `proposed_modifications` instead of `duplicates` — see Output Fields below. If your research adds nothing the existing description doesn't already say, it's a plain `duplicate`.

A site counts as matching the `sites` table if its name appears in the `sites` query results (see Database Interaction) **or** the matching `research_findings` row's `import_status` **begins with `"Ingested"`** — the migration script stamps that prefix once it actually creates a `sites` row directly (a legacy path — as of the current `runResearchFindingsMigration`, candidates route through `pending_submissions` instead, stamped `"Queued for approval"`, and are not "published" in this sense until an admin actually approves that submission). **Not every non-null `import_status` means published** — `"Queued for approval at ..."`, `"Held for review — ..."`, and `"Merged into submission ..."` all mean the row has been looked at by the migration script but no `sites` row exists yet; treat those as still staged, per the paragraph below. (A `"Rejected by admin at ..."` row already carries `status = 'excluded'`, so it's covered by the `excluded`-row exception instead — no separate handling needed.)

**Against `research_findings` rows at `status = 'lead'`:** a `lead` row is not yet vetted at all — it is a candidate site name someone flagged as worth checking, nothing more. If a fresh candidate (Entry Point A) matches an open lead, don't create a second entry for the same site — treat the lead row as the one to resolve (fold your research into it and continue to Step 4 on that row) rather than writing a new one. **Do not** apply the "matched unpublished row → set `status = 'candidate'`" shortcut described below to a `lead` row — a lead hasn't cleared Step 4 or the Qualification Filter yet, so its outcome has to be earned the same way a fresh candidate's would: run it through Step 4 and classification normally, and let *that* determine whether it lands at `candidate`, `excluded`, `duplicate`, or `proposed_modification`.

**Against `research_findings` rows at any other status (staged, not yet published):** Before finalizing your candidate list, check `research_findings` for the same site (see the duplicate-check query in Database Interaction). If it's already published (per the check above), it's not a `research_findings` match anymore — treat it as a `sites` match per that paragraph instead.

If it is **not** yet published and not a `lead` (i.e. it's already `candidate`, `duplicate`, `excluded`, or `proposed_modification` from an earlier run), don't write a new `sites`, `duplicates`, or `proposed_modifications` entry for it at all, and don't run Step 4 on it either — the dedup match is itself the decision, so **modify that `research_findings` row directly** (see the `UPDATE` pattern in Database Interaction) and stop there for this site:
- Fold any genuinely new information from your research into its `description` (and into `street_address`/`site_type`, if you captured them and the row doesn't already have them — never overwrite one that's already populated).
- Set `confidence` to whichever is **lower**: the row's existing confidence or the incoming item's (`low` < `medium` < `high`). For an Entry Point A candidate this is a genuine second, independent pass, so the comparison is meaningful. For an Entry Point B `lead` resolved this way, the only confidence it carries is its pre-verification placeholder from whenever it was queued — compare against that value, but don't read a downgrade here as "this run found new doubt"; no independent verification of the matched row actually happened.
- Set `status` to `candidate` — that's what tells the migration script to queue this for admin approval. If the row was already `candidate`, this is a no-op; if it was sitting in some other non-`lead` status, this is what actually fixes it. (See the one exception for `excluded` rows below.)
- **If the incoming item is itself a queued `lead` row** (Entry Point B, or a Step 3 match against an open lead elsewhere in this batch), that row still needs to be closed out — it can't be left at `status = 'lead'`. Set it to `status = 'duplicate'` with `name` set to the matched row's `name`, per the `duplicates` Output Fields shape. The matched row above is what actually carries any enrichment; the lead's own row just records that it resolved to the same site.

**Exception — `excluded` rows:** a prior run considered and rejected this site. This is a different question from "has it been published" — don't fold it into the rule above. Don't silently re-add it, and don't silently re-confirm the exclusion either. If your independent verification (Step 4) turns up nothing the earlier exclusion didn't already have, leave the row untouched and don't re-list it. If you find something that resolves the earlier doubt (a new independent source, a corrected claim), modify the row the same way as above — fold in the new information and set `status` to `candidate` — and say explicitly in `confidence_reason` what changed since the earlier exclusion. (The lower-confidence rule doesn't apply here: qualifying at all is a yes/no threshold, not something to average down.)

**Re-check anything Entry Point A's candidate list contains that a first-pass sweep wouldn't anticipate.** The Database Interaction name-keyword sweep is seeded from the *whole* candidate list handed off by Prompt 1, run before any per-candidate verification here starts. Run it accent-insensitively (see Database Interaction for why that matters) against both `sites` and `research_findings` — including `lead` rows — for every candidate before finalizing outcomes.

---

## STEP 4 — INDEPENDENT VERIFICATION OF ANY CLAIMED CONNECTION (MANDATORY BEFORE INCLUSION)

This step exists because dedication and proximity are easy to mistake for documented fact. A church built "in memory of" an event near a town is not the same as a church confirmed to stand at, or mark, the specific spot.

For every candidate, especially anything built, named, or dedicated *after* the saint's lifetime (basilicas, memorial churches, statues, monuments):

1. Identify the specific claim being made (e.g. "this building marks the exact place of X").
2. Find at least one source for that specific geographic/causal claim that is **not** the site's own devotional or promotional material — e.g. a neutral mapping/reference source (Google Maps place description), an academic or municipal historical source, or a heritage-registry entry (Wikipedia, national monument registries).
3. Check whether that source **confirms**, is **silent on**, or **contradicts** the claim:
   - **Confirms** → proceed to the qualification filter normally.
   - **Silent / no independent source found** → include only at `low` confidence, and say so explicitly in `confidence_reason`.
   - **Contradicts, or explicitly calls the connection coincidental/traditional-only** → do not include as a qualifying site. Move to `excluded` with the contradiction stated as the reason (e.g. "independent source describes the dedication as coincidental; actual event site is elsewhere").
4. When a devotional source and an independent source disagree, the independent source wins. Note the disagreement in `confidence_reason` or the exclusion reason rather than silently picking one.

**Capture the site's street address whenever your research surfaces one.** Whichever independent source confirmed the claim (Google Maps, an official site, a heritage registry, a municipal history page), if it states a specific postal address for the structure — street name and number, postal code, commune/town — carry it forward as `street_address` in Output Fields below. Omit if nothing more specific than the municipality/town was found — do not fabricate a plausible-looking street number, and do not include the country (tracked separately via `country`).

This is the step that would have caught, e.g., a memorial church built near a saint's capture site being mistaken for the actual location — an independent source (Google Maps / municipal history) may show the true event site is a different building or monument entirely.

---

## STEP 5 — ADDITIONAL TOPICS DISCOVERED AT A SITE

Research will sometimes surface a site's strong, documented connection to a saint or topic *other than* the one you were asked to research — for example, researching "St. Valentine" turns up the Old St. Ferdinand Shrine, which is also the resting place of St. Rose Philippine Duchesne. When this happens:

1. **Do not let the site's description read as single-topic if it isn't.** If a site qualifies for inclusion (or is already in the database) on the strength of the topic you were asked to research, but your research also surfaces comparably significant, documented connections to different saints or topics, the `description` must reflect all topics — do not write a description that only mentions your assigned topic and silently omits other well-documented connections you found in the same research pass.
2. **Tag it.** Check the `tags` table for an existing topic tag matching the additional topics (see Database Interaction). If one exists, reuse its `id`. If none exists, **create it now** — this is the one case in this prompt where tag creation happens inline rather than waiting for human review, because the tag is auxiliary to a site that's already going through review on the strength of the primary topic. Add the tag to the site's `tags` array alongside the primary topic tag.
3. **Do not chase it.** Discovering additional topics at one site is not license to go research those topics broadly within *this* run. Stay scoped to the current run's topic/region for your own search effort. This does not mean the additional topic goes unrecorded — see "Queue it" below.
4. **Queue it — and route it correctly.** This is the one part of Step 5 that changed with the v19 split, precisely to stop cheap, already-known leads from being wrapped in expensive full-topic-sweep jobs (see the v19 CHANGELOG entry). Two distinct things can come out of this step, and they route differently:
   - **You have a specific, named site connected to the secondary topic** — whether it's the site you're currently processing (already fully written this run under the primary topic) or some *other* specific place your research incidentally named (a passing mention of a second shrine, a different town's church, etc.) that you have **not** independently verified this run. For any such *other* named site, write it directly as a `research_findings` lead — **not** a `research_backlog` row:
     ```sql
     INSERT INTO research_findings (name, run_topic, run_region, status, description, confidence, confidence_reason, tags)
     VALUES (
       '[the other site's name]',
       '[secondary topic]',
       '[region, if evident, else NULL]',
       'lead',
       '[the claim/context that makes this plausible, and its source]',
       '[confidence in the lead itself, if you have a basis for one — else NULL]',
       '[why, if confidence is given]',
       '{}'
     );
     ```
     Check first (per Step 3's dedup rules, including `lead` rows) that this isn't already sitting in `research_findings` or `sites` under a different run. A lead created this way can be resolved later via this same file's Entry Point B, without ever triggering a broader search for the secondary topic.
   - **You have only the topic itself, with no other specific site name in hand** — just a hunch, from the strength of what you found at *this* site, that the secondary topic plausibly has more sites out there somewhere. Judge whether that hunch is strong enough to justify a real search: does the topic look like it has independent geographic or devotional spread (an open canonization cause, a title venerated at multiple named locations, a religious order or congregation likely to have multiple houses) as opposed to a one-off, incidental connection (a shared burial, a single relic transfer, a coincidental dedication) unlikely to recur elsewhere? If it clears that bar, queue a real topic-discovery job — the original mechanism, unchanged:
     ```sql
     INSERT INTO research_backlog (topic, region, seed_reference)
     VALUES ('[secondary topic]', NULL, 'Found at "[site name]" during the "[this run''s topic]" run.');
     ```
     but only if it isn't already sitting in `research_backlog` or represented by an existing topic tag search. If it doesn't clear that bar, don't queue anything further — the site itself is already fully captured under both tags (steps 1–2 above), and that's genuinely the end of it; a bare topic name with nothing to anchor it isn't worth a global sweep, and there's no lead to write since you don't have a specific place to point it at.

   **Rule of thumb: a specific site name in hand routes to a `research_findings` lead; only a topic with no specific site in hand ever routes to `research_backlog`.** This is the sharpest way to keep `research_backlog` reserved for genuinely open-ended searches, and to stop a known site from ever being wrapped in one again.

---

## QUALIFICATION FILTER

Apply this filter to every candidate. A site must pass ALL criteria to be included in output.

**Q1 — Specific locatable site:**
A named building, grotto, spring, shrine, statue, or other marked location. A town, region, or battlefield area does not qualify unless a specific named site or marker within it can be identified.

**Q2 — Direct significance to an apostolic Christian faith in one of these categories:**
"Apostolic faith" means Catholic (Latin or an Eastern Catholic Church), Eastern Orthodox, Oriental Orthodox (e.g. Coptic, Armenian, Syriac, Ethiopian), Assyrian, or another tradition holding apostolic succession. A site whose only religious connection is to a Protestant or other non-apostolic community does not qualify. A site that qualifies here but is outside full communion with Rome gets `site_type = other-religious` if still in active liturgical use by that tradition, or `heritage` if not — see Site Type Classification below. It is never `active-church` or `active-community`, which stay reserved for communion with Rome.

- **Apparition** — reported apparition of the Virgin Mary, Christ, or a saint
- **Miraculous Image** — a specific image or statue with a documented miraculous origin (not merely a venerated devotional image)
- **Martyrdom** — the specific site where a saint or martyr was killed or executed
- **Primary Relic** — site housing bodily remains of a saint
- **Site of Prayer or Divine Encounter** — a specific place where a saint habitually prayed or received a documented divine encounter
- **Documented Presence** — a specific place (building, castle, fortress, cell, or other marked location) where the saint is definitively known to have been present — as a resident, worker, minister, prisoner, captive, or defendant at trial, or during any other documented episode of their life. This covers birthplaces and homes, places of ministry or mission work, and places of captivity, capture, or trial alike. A town or general area does not qualify — the specific structure or marked location within it must be identifiable (e.g. "Beaurevoir Castle," not "Beaurevoir").

**Q3 — Not purely derivative:**
Exclude churches, chapels, shrines, statues, or monuments built in honor of a saint or devotion unless they also meet Q2 independently (i.e. they contain a primary relic, a miraculous image, or are themselves confirmed — per Step 4 — to mark the site of a specific documented encounter, martyrdom, or other qualifying event). A church named after Joan of Arc does not qualify. The chapel where she prayed before leaving for war does qualify.

**Exception — purpose-built marker at a confirmed or confined location:** A structure or monument built after the saint's lifetime (chapel, basilica, or statue) qualifies under Q2 if **both**:
(a) it was built specifically to mark one documented occurrence at that place (not general veneration of the saint), and
(b) Step 4 verification confirms — or at minimum does not contradict — that the location is correct, even if the precise spot within a field/town cannot be pinned down further.

This applies equally to statues and monuments: a statue qualifies under this exception if it definitively and geographically marks a significant, documented life event (e.g. an equestrian statue erected at the confirmed site of a saint's capture), on the same terms as a chapel or basilica would. A statue that is merely decorative or general veneration (e.g. a statue in a city square with no specific site claim) does not qualify.

If Step 4 turns up a contradiction (an independent source calls the siting coincidental or wrong), the exception does not apply — exclude per Step 4.

---

## INTEREST TIER CLASSIFICATION

Once a candidate clears the Qualification Filter above, assign it an interest tier. This runs on every `sites` and `proposed_modifications` entry — not on `excluded` (it never cleared Q2) or `duplicates` (no fresh evidentiary basis to classify from; nothing here overrides a tier already set on the matching `sites`/`research_findings` row).

The tier is a judgment about *documented reach*, not fame, prettiness, or administrative status — see "What NOT to use as evidence" below before assigning one.

### Tiers

**`global`** — Independently clears Q2 at a scale recognized across the whole Church, regardless of nationality: apostolic tombs, Vatican-recognized apparitions with worldwide devotion, relics of universally venerated saints, the founding shrine of a worldwide religious order, sites anchoring a globally known pilgrimage tradition. Test: would this appear on a "greatest Catholic pilgrimage sites in the world" list compiled by someone with no connection to its home country? → Homepage.

**`regional`** — Independently clears Q2, with *documented* ongoing veneration reaching beyond the immediate town: an active procession, a bishop-authorized devotion, real pilgrim volume, a known regional/national pilgrimage circuit. The evidence must describe actual draw, not just designation or dedication. → Prominent on country/region tag pages, not homepage.

**`local`** — Independently clears Q2, is the town's/parish's real point of devotional practice (where the relic rests, where the miracle/apparition is venerated), but nothing in the research indicates draw from outside the immediate area. → Prominent on municipality and topic tag pages.

**`topical`** — Independently clears Q2 (most often *Documented Presence*: a birthplace, home, workplace, place of captivity or trial) but is not itself a place of ongoing devotional practice — informative to someone tracing the saint's story, not a destination people travel to or pray at regularly. The distinguishing question: is there any evidence people *visit this specific place on purpose*, beyond passing through as part of a broader circuit? If a documented-presence site is confirmed as an active stop on an established pilgrimage circuit (not just biographically true), that's evidence of real draw — grade it `local`/`regional` instead. → Topic/saint tag page only.

### What NOT to use as evidence

Do not let these push a tier up on their own — note them as context if present, never as the deciding factor:
- Administrative designation (National Shrine, Minor Basilica, Cathedral status) — too common to indicate reach (~280 National/International Shrines worldwide per gcatholic.org).
- The general fame of the *devotion* or *saint*, divorced from *this specific site's* role in it (Our Lady of Guadalupe is globally famous; a parish merely named for her, with no image/relic/apparition claim of its own, is not).
- The prominence of the *city* the site sits in (a little-known relic chapel in New York City is still little-known).
- Superlatives in the source description ("world's largest," "most renowned") unless they describe something that independently satisfies Q2.

---

## SITE TYPE CLASSIFICATION

Every `sites` and `proposed_modifications` entry also gets exactly one `site_type`. This is a statement about **what the place is today**, independent of the interest tier (which measures reach) and of why it qualified under Q2. You will almost always already have the evidence for this from Step 2/Step 4 research — a Mass schedule, a parish or sanctuary website, a monastic community's own site, a museum/monument page, or a "now a mosque/museum/ruin" line in the article. Don't run extra searches just for this; if the evidence is genuinely ambiguous, pick the best-supported value and say so in `confidence_reason`.

Apply this decision order — **the first rule that matches wins**, which is what keeps the four values mutually exclusive:

1. **`active-community`** — the site is home to an active religious community in communion with Rome (monastery, convent, abbey, charterhouse, motherhouse). This deliberately trumps `active-church`: a monastery whose church also holds public Masses is `active-community`, full stop.
2. **`active-church`** — Catholic services in communion with Rome are regularly celebrated at the site (parish church, sanctuary, basilica, shrine chapel with scheduled liturgy — including non-church structures like an apparition grotto with regular liturgical use).
3. **`other-religious`** — the site is in active use by a religious tradition not in communion with Rome (Orthodox, Protestant, or another religion — e.g. a former Catholic basilica now serving as an Orthodox cathedral or a mosque).
4. **`heritage`** — no active services of any tradition are celebrated there: ruins, monuments, statues, memorials, museums, deconsecrated or preserved-but-unused churches, castles, springs, and marked historical locations.

Two consequences of the ordering worth spelling out: activity is judged before denomination, so a **ruined or museum-ified site is `heritage` no matter whose tradition it belonged to** (an abandoned Orthodox monastery is `heritage`, not `other-religious`); and an active non-Catholic monastic community lands in `other-religious`, not `active-community` — the community categories are reserved for communion with Rome, per their definitions.

---

## OUTPUT FIELDS

### New candidates (`sites`)

- `status` = 'candidate'
- `name` — the site's display name, **translated into English** — see **Name formatting** below for the exact rules. Do not default to the native-language name just because translating feels awkward or uncommon in English sources; that silently defeats `native_name` capture below, since nothing is left to differ from once `name` already *is* the native form.
- `native_name` — The name in the site's local/native language, if it differs from the English `name` you're using. Pull this from the native-language pass already run in Step 2 of Prompt 1 (or, for a lead, whatever context it arrived with) — do not run a separate search for it. This is the primary, authoritative source for `native_name`; if it's not available, leave this blank rather than guessing — the migration script has its own backfill step (a Wikidata/Wikipedia language-link lookup, falling back to checking the official site's own language toggle) for gaps this leaves behind.
- `country` — ISO 2-letter code
- `municipality` — city or town
- `street_address` — **optional.** The site's specific postal address (street name and number, postal code, commune/town), if your research surfaced one — see Step 4. Exists purely to feed the migration script's geocoder a precise, structured input instead of just a name and town; never shown to end users and never carried into the public `sites` record.
- `description` — a 1–3 sentence (occasionally 2 short paragraphs) factual write-up in the house style (see below). Per Step 5, this must reflect every comparably significant, documented topic connection your research turned up, not only the topic you were assigned.
- `confidence` — `high` (clearly meets all criteria, confirmed by an independent source where applicable) / `medium` (likely qualifies but one criterion is uncertain) / `low` (included for completeness; significant doubt about qualification, or no independent confirmation found)
- `confidence_reason` — **required whenever confidence is `medium` or `low`**, optional (may be omitted or brief) at `high`. One or two sentences stating specifically what is uncertain: which criterion is in doubt, what source is missing, or what conflicting information exists. This exists so a reviewer who can't dig into every finding can see at a glance *why* it's not `high` without re-deriving it themselves. Bad example: "Not fully confirmed." Good example: "No independent source found confirming this is the exact structure Joan prayed in — only the parish's own history page makes this claim."
- `interest` — one of `global` / `regional` / `local` / `topical`, per the Interest Tier Classification section above.
- `site_type` — one of `active-church` / `active-community` / `other-religious` / `heritage`, per the Site Type Classification section above. Required on every `sites` entry. Unlike `street_address`, this IS carried into the public record — the migration script writes it to `sites.type`.
- `tags` — an array of topic-tag slugs that apply to this site (see Tagging below), including any secondary-topic tags identified in Step 5. Geographic tags (country/region/municipality) are handled separately by a later process and should **not** be included here.
- `source_links` — URLs from pages you actually consulted during Step 4 (or already handed off from Prompt 1's Step 2) research that a reader would find useful for learning more, in priority order: (1) the site's official website (not an aggregator or tourism website), (2) the specific site's own Wikipedia article, if one exists, (3) other authoritative sources, preferably from non-secular sites. Each entry: `{"url": "...", "link_type": "Official Website" | "Wikipedia" | "Context about the page and name of site publisher (e.g. History of the site by Jesuits Canada)"}`. Omit entirely if none of these were found — do not pad with tangential or low-quality pages just to fill the array. **Never include the Wikipedia article for the topic/person being researched** (e.g. the saint's own Wikipedia page) — only the article for this specific place, if a distinct one exists. A saint's birthplace, home, or place of martyrdom does not inherit the saint's own Wikipedia link just because it was consulted for biographical context.
- `celebrations` — **optional.** Only include when your research surfaced a specific, named, dated celebration tied to *this* site itself — a patronal feast accompanied by special and well-known celebration, a translation-of-relics anniversary, an apparition-anniversary pilgrimage day, etc. — not a generic devotion or feast date that is not specifically celebrated at this location. Each entry: `{"date_label": "...", "description": "..."}`, both **translated into English** even when the source material is in the site's native language. `date_label` holds only the date or time period (e.g. "October 12", "two weeks before November 16", "2nd Sunday in June") — never the celebration's name or any other detail. `description` holds the celebration's name and every other detail (what it is, what happens, why it's held); do not end it with a period. It is highly unlikely that there is a celebration if the site is not an active church - use this as a sanity check. Omit entirely if nothing site-specific was found; do not guess or generalize from the broader devotion's calendar.

### Proposed modifications to existing sites (`proposed_modifications`)

For a candidate that matches an existing `sites` row (per Step 3) where your research turned up meaningfully new information:

- `status` = 'proposed_modification'
- `name` — the existing site's name, exactly as stored in `sites`
- all other fields as specified for new candidates above, incorporating the proposed adjustments to those fields
- `change_summary` — one or two sentences naming specifically what's changed (a fact, date, relic, corrected error, additional tag, changed interest level, additional source, etc.) and why it's worth updating the record. Not "more detail" — name the actual new information.

**Reminder:** `proposed_modifications` is only for matches against a *published* `sites` row (see Step 3 for how "published" is determined) — never invent one whose `existing_site_name` doesn't actually exist in `sites` yet.

### Excluded candidates (`excluded`)

- `status` = 'excluded'
- `name` and `reason` only.

### Duplicates with nothing new (`duplicates`)

- `status` = 'duplicate'
- `name` only — the existing site's name, exactly as stored in `sites`.

### Description style guide

- Tone is encyclopedic and factual, never promotional. Avoid superlatives unless they're doing factual work ("one of the most renowned pilgrimage sites," used sparingly, not "a must-see").
- Lead with the single fact that matters most: what the site is, and why it's here (e.g. "The Basilica of Our Lady of Alençon is a magnificent Gothic church in France, renowned as the baptismal site of Saint Thérèse of Lisieux.").
- Name specific people, dates, and relics rather than describing things generically ("a rib fragment of the saint in the basilica crypt," not "some relics").
- Use "According to tradition" / "According to legend" to hedge claims that are pious tradition rather than documented history — do not present legend as fact, but don't over-hedge documented history either.
- When relevant, close with a present-tense note on what a visitor can see or do there today ("Today visitors can venerate her incorrupt body...").
- Length: typically 2–5 sentences. Occasionally two short paragraphs separated by a blank line when both the historical background and the present-day site need covering. Never a full page.
- No first person, no calls to action, no marketing language ("don't miss," "a must for pilgrims").
- If the site carries a documented secondary-topic connection (Step 5), give it real coverage, not a token clause — a reader should come away understanding both connections, not just notice a name dropped in passing.
- **Do not repeat generic facts about the topic itself** — a saint's canonization date, overall cause of fame, or biographical facts unrelated to this particular site belong on the topic page, not restated in every site tied to that topic (e.g. a saint's birthplace entry should not also note where or how they were later martyred, or when they were canonized). Only include such a fact when it is specific to what happened *at this site* — e.g. the site where a martyr was actually killed should describe how they died there, since that fact belongs to that location, not just the topic in general.

### Name formatting

This section governs `name` (and, for `proposed_modifications`, any renaming you propose for an existing site's `name`). `native_name` is covered by its own field description above — get the translation direction right first, since a `name` that's still in the native language is what silently breaks `native_name` capture.

- **Always attempt an actual English translation** for `name`. A site being "known in English by its local form" is genuinely rare — do not reach for this as a default just because a translation feels awkward or unfamiliar.
- **Part of a larger place:** join with a comma — `Cross of Recognition, Old Market Square`, not a parenthetical.
- **Known by two distinct names** (e.g. an official/dedication name and a separate structural or colloquial name): join with parentheses — `Joan of Arc's Tower (Keep of Rouen Castle)`.
- **A town/location name merely appended as a disambiguator**, with no independent identifying value of its own: strip it. `municipality` already captures the town separately and it will be shown elsewhere on the site's record. Do this even when the bare name is generic and shared by unrelated sites worldwide (`St. Paul's Church`, `St. Xavier's Church`, stripped from "St. Paul's Church, Melaka" and "St. Xavier's Church, Punnaikayal") — consistency in `name` matters more than disambiguating against sites this database isn't even recording. Three narrow exceptions:
  1. The appended-looking text is actually the site's own documented/traditional name, not a disambiguator you're adding (`Basilica of Saint-Denis` stays, even though it happens to match the municipality).
  2. It distinguishes between two specific, similarly-named structures **in the same place** (`Old Cathedral of Salamanca`, kept, because the separate `New Cathedral of Salamanca` sits right next to it — both real, both load-bearing).
  3. The appended location is a sub-district or neighborhood distinct from what `municipality` captures, so stripping it would lose real, otherwise-uncaptured precision (`Monument of St. Francis Xavier, Hative Besar` — Hative Besar is a sub-district, not the municipality itself).
- **Devotional titles that read like place names are not location tags — never strip them:** `Bom Jesus` in `Basilica of Bom Jesus`, `Tuan Ana` in `Tuan Ana Chapel`, and a saint's own family name (`Xavier`/`Javier` in `Castle of Xavier`) are part of the name, not an appended disambiguator.
- **Reorder for natural English** when a literal translation puts a descriptor in a non-English word order — `Kanda Catholic Church`, not `Catholic Kanda Church`; `Chapel of Our Lady (Tuan Ma)`, not `Tuan Ma (Chapel of Our Lady)`.
- **Abbreviate religious titles** in `name` per this list. Do not abbreviate anything not on it, and do not expand it further:

  | Title | Abbreviation |
  |---|---|
  | Saint | St. |
  | Blessed | Bl. |
  | Venerable | Ven. |
  | Servant of God | S.D. |
  | Father | Fr. |
  | Brother | Br. |
  | Sister | Sr. |
  | Monseigneur / Monsignor | Msgr. |
  | Cardinal | Card. |
  | Archbishop | Abp. |
  | Bishop | Bp. |
  | Deacon | Dcn. |
  | Pope | *(left unabbreviated — "Pope St. John Paul II," not "P. St. John Paul II")* |

  Religious-order post-nominals (S.J., O.P., O.F.M., C.M., O.S.B., etc.) usually arrive already abbreviated in source material — preserve them exactly as given; don't expand or re-abbreviate them yourself.

### Tagging

- `tags` contains **topic**-type tags only (e.g. `joan-arc`). Do not propose or include country/region/municipality tags in this field — those are out of scope for this prompt and handled downstream.
- A site may carry more than one topic tag if more than one clearly applies (e.g. a site tied to both a specific saint and a broader movement/order tag, or a primary and a Step 5 secondary topic), each independently justified by the discovery research.
- **Slug convention for any newly proposed topic tag:** lowercase, hyphenated, honorific dropped (`joan-arc`, not `st-joan-arc`; `roman-martyrs`, not `saint-roman-martyrs`). This matches the majority convention in the existing `tags` table.
- If the topic given as input already has a matching tag (query the `tags` table — see below), use its existing `id` exactly rather than inventing a new one, even if it doesn't follow the convention above.
- **For the primary topic you were assigned:** do not create tags in the database from this prompt. Only reference tag slugs in the output; tag creation (for a genuinely new primary topic tag) happens in a future step.
- **For a Step 5 secondary topic:** this restriction does not apply — create the tag inline per Step 5.2. This is a deliberate exception to the rule above, scoped only to secondary topics discovered incidentally at an already-qualifying site.

---

## DATABASE INTERACTION

Before finalizing any output, query the Orbis Dei Supabase database (project ID: `vrnzirtvplbfxepgidhr`) to retrieve sites already in the inventory that are relevant to this run's topic and/or region, to check for an existing topic tag, and to check for anything already staged.

**Check for an existing topic tag:**
```sql
SELECT id, name FROM tags
WHERE type = 'topic' AND name ILIKE '%[keyword]%'
ORDER BY name;
```
Search likely variant forms of the name, not just the literal input (e.g. "Our Lady of X," "Virgin of X," and "X" alone) — a near-synonym tag already existing under a different phrasing is a duplicate tag waiting to happen.

**Retrieve the existing inventory.** One query shape, three WHERE variants — run every variant that applies (the name-keyword sweep ALWAYS runs, since tag- and region-based lookups are blind to a topic that has no tag yet and isn't region-scoped). The select list pulls `short_description` and `interest` too — needed for the proposed-modifications comparison in Step 3 and the tier check above:
```sql
SELECT s.name, s.municipality, s.country, s.short_description, s.interest
FROM sites s
-- (a) topic tag known:
--   JOIN site_tag_assignments sta ON s.id = sta.site_id  WHERE sta.tag_id = '[relevant_tag_id]'
-- (b) region given:
--   WHERE s.country = '[ISO_2_LETTER_CODE]'
-- (c) name-keyword sweep (ALWAYS run) — the topic's own name plus the specific
--     place-names this run's candidate list already names (birthplace, major
--     shrine towns, relic-holding churches, etc.):
--   WHERE s.name ILIKE '%[keyword1]%' OR s.name ILIKE '%[keyword2]%' OR s.municipality ILIKE '%[keyword1]%'
ORDER BY s.name;
```
**Run the name sweep accent-insensitively** — wrap both sides of every `ILIKE` comparison in `unaccent()`, e.g. `WHERE unaccent(s.name) ILIKE unaccent('%[keyword]%')`. The `unaccent` extension is enabled on this project (confirmed 2026-08-08, migration `enable_unaccent_extension`) — use it directly rather than hedging on whether it's available. A plain `ILIKE` is not diacritic-insensitive: `'%gesu%'` does not match `'Gesù'`, and `'%premontre%'` does not match `'Prémontré'` — this exact gap once let the same church get logged as two separate `research_findings` rows under "Gesu" and "Gesù" from two different topic runs, neither catching the other, and separately caused a live triage pass to misreport three correctly-tagged sites (Abbey of Prémontré, Convento de la Encarnación) as missing entirely. If `unaccent()` is ever unavailable in a future environment, fall back to checking both the accented and unaccented form of every keyword by hand — but that's the fallback, not the default.

**Keep this result set at hand** — it's one of the two signals Step 3 uses to decide whether a `research_findings` match has actually been published. Per Step 3, also re-run the sweep (same accent rules, against both `sites` and `research_findings`) for anything on the candidate list that a first pass wouldn't anticipate.

**Check `research_findings` for anything already staged on this topic** — this is the duplicate check described in Step 3, and it runs regardless of whether the tag above existed, and regardless of entry point. This is the query that surfaces both non-`lead` staged rows and open `lead` rows alike (no status filter):
```sql
SELECT id, run_topic, run_region, name, status, tags, category, description, interest,
       current_short_description, change_summary, exclusion_reason,
       native_name, source_links, celebrations, street_address,
       site_type, confidence, import_status
FROM research_findings
WHERE '[relevant_tag_id]' = ANY(tags) OR name ILIKE '%[keyword]%'
ORDER BY created_at;
```

**Determine whether a matched `research_findings` row has already been published:** cross-check its `name` against the `sites` query results retrieved above (case-insensitively, allowing for minor punctuation differences), and check whether its `import_status` **begins with `"Ingested"`** (a legacy path — see Step 3). If either is true, it's published — handle it per Step 3's first paragraph, as a `sites` match. If neither is true, and its `status` is not `lead`, it's still just staged — see the single `UPDATE` pattern below. If its `status` **is** `lead`, see Step 3's `lead`-row paragraph instead — it goes through Step 4/classification like a fresh candidate, not the shortcut below. Either way, corroborate any name match with `country` (or a documented connection) per Step 3 before treating it as the same site.

**`import_status` values and what counts as "published" are defined in Step 3** (the "Against the `sites` table" paragraph) — that's the single source of truth for the `"Ingested"`-prefix rule and for why `"Queued for approval..."`, `"Held for review..."`, and `"Merged into submission..."` all still mean staged, not published. Apply that rule here without re-deriving it: any row not meeting Step 3's "published" test runs the `UPDATE` pathway below, not a `sites`-match.

**Modifying an unpublished, non-`lead` `research_findings` row** (Step 3):
```sql
UPDATE research_findings
SET description = '[merged description incorporating any new information; unchanged if there is none]',
    street_address = COALESCE(street_address, '[captured value, if newly found]'),
    site_type = COALESCE(site_type, '[this run''s site_type classification]'),
    tags = '[the row''s existing tags array, unioned with any tags this run''s research supports adding — e.g. a Step 5 secondary-topic tag]',
    confidence = '[the LOWER of the row''s existing confidence and this run''s confidence: low < medium < high]',
    status = 'candidate'
WHERE id = '[matched row's id]';
```
Do not overwrite `street_address` or `site_type` if already populated — only fill them in when empty (if your research genuinely contradicts an existing `site_type` — e.g. the earlier run called it an active church and you found it's been deconsecrated — overwrite it and say so in the description/`confidence_reason` rather than leaving the stale value). `tags` is additive only — union in new tags your research supports (e.g. this run's own primary-topic tag, or a Step 5 secondary tag), never drop a tag the row already had. Always set `confidence` to the lower of the two values, even when nothing else about the row changes. The one exception is a matched row currently `excluded`: see Step 3's exception for that case — leave `status` alone unless your research actually resolves the earlier rejection, and don't apply the lower-confidence rule to it (qualifying at all is a threshold, not an average).

**Resolving a `research_findings` row currently at `status = 'lead'`** (Entry Point B, or a Step 3 match against an open lead): run it through Step 4 and classification exactly like a fresh candidate — nothing here is pre-decided by the fact that it was already flagged as worth checking. **Exception:** if Step 3 instead matches the lead to an already-staged *non-lead* row (see the "any other status" paragraph), that dedup match resolves it on its own — no Step 4 pass — and the lead closes out as `duplicate` per that paragraph's last bullet. Otherwise, once you have an outcome, `UPDATE` that same row in place (never `INSERT` a new one):
```sql
UPDATE research_findings
SET status = '[candidate | excluded | duplicate | proposed_modification, per the outcome]',
    description = '[full researched description, per Output Fields]',
    country = '[...]', municipality = '[...]', street_address = '[...]',
    native_name = '[...]', source_links = '[...]', celebrations = '[...]',
    confidence = '[...]', confidence_reason = '[...]',
    interest = '[... , NULL if excluded/duplicate]',
    site_type = '[... , NULL if excluded/duplicate]',
    tags = '[the row''s existing tags array, unioned with this run''s tags]',
    exclusion_reason = '[only if status = excluded]',
    change_summary = '[only if status = proposed_modification]',
    existing_site_name = '[only if status = proposed_modification]'
WHERE id = '[the lead row's id]';
```

Apply the per-status handling from Step 3 to whatever the `research_findings` query returns.

**Writing results (Entry Point A):** After producing the JSON output above, write every net-new entry directly into `public.research_findings`, one row per entry, including the `status` which was specified above, the `site_type` classification, and `street_address` whenever you captured them. Matches against an existing row use the `UPDATE` patterns above instead of a fresh `INSERT`.

Insert/update these rows as part of running this prompt — do not wait for separate confirmation before writing to `research_findings`. `research_findings` is a staging table only: nothing from this prompt is ever written to `sites`, `tags`, or `site_tag_assignments` directly (except the inline Step 5 secondary-topic tag creation, which is the sole exception). Promoting a `research_findings` row into those tables is a separate, later step (`runResearchFindingsMigration`), which carries `interest` over to `sites.interest` and `site_type` over to `sites.type`.

**Updating `research_backlog` (Entry Point A only — skip entirely for Entry Point B):** `research_backlog` is the separate queue of topic/region pairs still to be (or previously) researched, with columns `topic`, `region`, `status`, `completed_at`, and `seed_reference`. `completed_at` is the structured gate Prompt 1's Step 0 filters on (NULL = still queued); `status` is a free-text, append-only human log of what happened on each run, including later curator overrides — it no longer controls whether the row gets picked again. Not every row has both `topic` and `region` filled in — match against whichever of the two this run was given.

Immediately after writing this run's entries to `research_findings`, in the same operation:

1. **Use the `research_backlog` row `id` handed off from Prompt 1's Step 0.** Do not re-look it up by matching `topic`/`region` again; go straight to the `UPDATE` below with that `id`.
2. **Compose the status line**, counting the entries actually written to `research_findings` in this run:
   ```
   Completed research at yyyy-mm-dd HH:MI - X new, Y proposed modifications, Z duplicates
   ```
   - Timestamp is the current time **converted to US Eastern time** (`America/New_York`), 24-hour clock: `to_char(now() AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI')`.
   - `X` = count of `sites`-status entries you inserted this run, **plus** any `research_findings` rows whose `status` you set to `candidate` for the first time this run via the Step 3 `UPDATE` (including a resolved `lead`) — those are genuinely new sites-to-be, even though they arrived via an `UPDATE` rather than an `INSERT`. `Y` = count of `proposed_modifications` entries written. `Z` = count of `duplicates` entries written. (`excluded` entries are not counted in this line. A row that was already `candidate` and merely got enriched or had its confidence lowered was already counted whenever it was first inserted — don't double-count it, but do mention the change in your plain-text summary.)
   - A zero-result run still gets a line: `Completed research at ... - 0 new, 0 proposed modifications, 0 duplicates`.
   - Always start the line with exactly `Completed research at`, not a variant wording — this is just a human-readable convention now (Prompt 1's Step 0 gates on `completed_at`, not this text), but keep it consistent with the existing log history.
3. **Write the line:**
   - If the row was found in Prompt 1's Step 0 (the normal case — it was already queued), **append** to `status` — do not overwrite — so every run's history is preserved, and set `completed_at` (only if not already set, so a later curator-override append on an already-completed row doesn't shift its completion time):
     ```sql
     UPDATE research_backlog
     SET status = COALESCE(status || E'\n', '') || '[new status line]',
         completed_at = COALESCE(completed_at, now())
     WHERE id = '[id selected in Prompt 1's Step 0]';
     ```
   - If no matching row existed at all (this run wasn't queued in advance — e.g. an ad hoc run — but should still leave a record), insert one:
     ```sql
     INSERT INTO research_backlog (topic, region, status, completed_at)
     VALUES ('[this run's topic, or NULL]', '[this run's region, or NULL]', '[new status line]', now());
     ```
4. **Queue any Step 5 secondary topics** per Step 5.4 above — a `research_findings` lead, a `research_backlog` topic-discovery row, or nothing further, depending on the judgment call made there.

---

## END-OF-RUN SUMMARY

**Entry Point A:** After completing all database writes, output a brief plain-text summary covering: the topic/region researched tonight, and the final counts (X new, Y proposed modifications, Z excluded, W duplicates). Explicitly call out, by name, any `research_findings` rows you modified per Step 3 — what changed (new information folded in, confidence lowered, status set to `candidate`) — so a reviewer sees exactly what happened rather than a silent DB update. If the backlog was empty and no run occurred (per Prompt 1's Step 0), say so instead.

**Entry Point B:** Output a brief plain-text summary covering: how many leads were resolved and the outcome of each by name (became a candidate / proposed modification / excluded / duplicate), plus the same counts format as above for consistency. There is no backlog line to write.
