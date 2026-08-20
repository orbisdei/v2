# Discovery Prompt — Changelog

Version history for `orbisdei-discovery-prompt-v*.MD` and, as of v19,
`orbisdei-verify-stage-prompt.MD`. Moved out of the prompt itself as of v14 —
the model doesn't need version history at runtime, and every rule the
changelog explains is (and must remain) stated in the prompt body.

## v21 (2026-08-20) — Prompt 2 source_links: link_type example text stopped being copied verbatim

`source_links`' `link_type` field was written as a pseudo-enum —
`"Official Website" | "Wikipedia" | "Context about the page and name of
site publisher (e.g. History of the site by Jesuits Canada)"` — with the
third branch meant as an instruction (describe the page/publisher) rather
than a literal value, but formatted identically to the two real literal
values before it. The research model couldn't reliably tell the
difference and repeatedly copied that instructional sentence itself in as
the literal `link_type` — confirmed in production: 78 occurrences in
`research_findings.source_links` and 74 carried forward into the
`pending_submissions` approval queue (e.g. "Holy Trinity Church,
Hrushiv"), 0 on live `site_links` (nothing published with the bug yet).

**What changed:** the bullet now states plainly that `link_type` is the
literal string `"Official Website"` or `"Wikipedia"` for those two source
kinds, and for any other source it's freeform text describing the page
and publisher — explicitly never the example text, and never any part of
the instruction itself.

**Also needs doing:** the installed skill copy
(`~/.claude/skills/orbis-dei-discovery/references/output-schema.md`) was
not reachable from the session that made this edit (cloud session, no
access to the local skill install) — per the Known Gotchas entry in
`CLAUDE.md`, apply the same wording fix there before this actually takes
effect on a real nightly run.

## v20 (2026-08-19) — Prompt 2 Tagging: explicit naming-source priority

Prompt 2's Tagging section (`## Tagging`) gained rules that were previously
implicit or absent, sourced from a newer copy of the installed skill's
`references/output-schema.md` that had drifted ahead of this repo file on
this one section specifically (everything else in that copy — `SKILL.md`
and `references/database-interaction.md` — matched the version already
installed in this session's environment, which is itself older than this
repo's v19 architecture and lacks the `'lead'`-status Entry Point B split;
that mismatch was surfaced and deliberately NOT merged back — see the "Known
Gotchas" entry in `CLAUDE.md`).

**What changed, in the Tagging section:**
- **Naming-source priority is now explicit:** the *Catholic Encyclopedia*
  (newadvent.org/cathen) entry title wins, but only when a *dedicated* entry
  for that specific person/topic exists — an incidental mention inside a
  different person's entry doesn't count, however tempting the ready-made
  spelling. Falls back to the English Wikipedia article title otherwise.
- **Don't invent a disambiguating epithet the saint isn't customarily known
  by**, just because an unrelated saint happens to share the plain name.
  Keep exactly the qualifier the winning master source's own title uses, no
  more.
- **Don't confuse a master source's terse internal entry title with the
  saint's actual customary name** — cross-check the fallback source's title
  and how the master source refers to the same person elsewhere before
  dropping a place epithet.
- **Never write a single-shrine "Our Lady of ___" tag.** These titles are
  near-always unique to one site, so a topic tag for one adds nothing and
  invites a false match later; leave `tags` empty rather than inventing one.
- **The primary-topic bullet was expanded**, not just reworded: it was
  previously easy to misread as "don't populate `tags` for the primary
  topic at all." Clarified that only the `tags`-table `INSERT` is deferred
  — the `research_findings.tags` array itself always carries the proposed
  slug for the primary topic, existing-tag match or newly proposed.

**Why not a bigger merge:** the source copy's overall architecture (single
file, no `research_backlog.completed_at`, no `'lead'` status, no Entry
Point A/B) is older than this repo's v19 split and would have silently
discarded the lead-routing fast path v19 exists to provide. Only the
Tagging delta was genuinely new information; the rest was reconciled away
rather than merged. If the *installed* skill this session sees really is
what's running nightly, it needs the v19 rework ported to it separately —
that's a different, follow-up task, not part of this change.

## v19 (2026-08-08) — split into Prompt 1 (Discovery) + Prompt 2 (Verify & Stage)

**Same-day follow-up:** verifying the `research-backlog-triage.md` proposal
against live `research_findings.tags` (all 51 "already captured" Section C
pairs checked directly) confirmed Step 5.2's tagging held up in every case,
but also surfaced that the `unaccent` Postgres extension was never installed
on this project — Step 3/Database Interaction's accent-insensitive sweep
guidance had been hedging on an extension that wasn't actually there. Fixed:
`unaccent` is now enabled (migration `enable_unaccent_extension`, verified
working against the `Prémontré`/`Encarnación` cases that exposed the gap),
and Prompt 2's dedup guidance now says to use `unaccent()` directly instead
of hedging on availability.

**Why:** as of this date, 122 of 169 `research_backlog` rows were open, and
120 of those 122 carried a `seed_reference` — i.e. almost the entire live
backlog was single-site follow-up leads (found incidentally via Step 5 of an
earlier run) dressed as full topic/region discovery jobs. Under the old
single-file prompt, every one of those rows triggers a full Steps 1–2 sweep
(broad, multi-language, "run until redundant") the moment it's picked up —
expensive and mostly redundant when the actual ask is "check this one known
site." There was no way to resolve a specific known lead (e.g. two candidate
Marian sites in Alsace) without either manually skipping most of the prompt
by hand or paying for a global topic search neither wanted nor needed.

**What changed — the prompt is now two files:**
- `orbisdei-discovery-prompt.MD` ("Prompt 1: Discovery") — Steps 0–2 only:
  select a topic/region from `research_backlog`, knowledge recall, web
  research. Produces a candidate list, writes nothing to the database itself.
- `orbisdei-verify-stage-prompt.MD` ("Prompt 2: Verify & Stage") — new file,
  carrying forward (largely unchanged) the old Steps 3–5, Qualification
  Filter, Interest Tier/Site Type Classification, Output Fields, Name
  Formatting, Tagging, and Database Interaction/writes sections. Has two entry
  points: **Entry Point A**, chained directly from Prompt 1 within the same
  run (so a full topic/region run costs the same total tokens as the old
  single-file version — nothing is re-derived across the handoff); and **Entry
  Point B**, standalone, against `research_findings` rows at a new
  `status = 'lead'` value — resolving one or a handful of already-known site
  names without any Discovery sweep or `research_backlog` involvement at all.
  Multiple leads/candidates in one run are processed in a single continuous
  pass (loading the ruleset once, not once per site) rather than fanned into
  separate invocations — see "Processing multiple leads or candidates in one
  run" in Prompt 2. `research_backlog` itself is schema-unchanged and stays
  reserved for genuinely open-ended topic/region searches.
- **`research_findings.status` needs a new allowed value: `'lead'`** (the
  existing CHECK constraint only allows `candidate` / `excluded` / `duplicate`
  / `proposed_modification`). Confirmed safe against `migrateResearchFindings.ts`
  — its candidate query is `.eq('status', 'candidate').is('import_status', null)`,
  so a `lead` row is invisible to the migration script by construction; no
  script changes needed. Backfill decision for the existing 120 seeded
  `research_backlog` rows deliberately deferred — those rows are left running
  the old full-topic-sweep path for now; only *new* Step 5 leads (and
  manually-queued ones) use the new mechanism. **Constraint migration applied
  2026-08-08** (migration `add_lead_status_to_research_findings`) — `'lead'`
  is now a valid `research_findings.status` value; Entry Point B and the new
  Step 5 routing are unblocked. Note for anyone touching this constraint
  later: it's named `research_backlog_status_check` despite living on
  `research_findings`, not `research_backlog` — a pre-existing naming quirk,
  left as-is rather than renamed, to avoid disturbing anything that already
  references that name.
- **Step 5's "Queue it" now routes two different ways** instead of always
  writing to `research_backlog`: a specific named site (whether the one just
  processed, or another one incidentally mentioned in research but not
  independently verified this run) becomes a `research_findings` lead
  directly; only a secondary topic with *no* specific site name in hand, and
  independent judgment that it likely has broader geographic/devotional
  spread, still spawns a `research_backlog` topic-discovery row. Rule of
  thumb stated in the prompt: a specific site name in hand → lead; a bare
  topic with nothing to anchor it → backlog, and only if the judgment call
  clears the bar. This is the change that actually stops a known site from
  ever being wrapped in a full sweep again — the old mechanism only ever
  queued a topic name, never a site name, which is why the backlog filled up
  with full-sweep jobs for what were mostly single-site follow-ups.
- Step 3's dedup/match handling gained an explicit `lead`-row case: a lead
  is unvetted (never ran through Step 4 or the Qualification Filter), so a
  match against one does NOT get the "just stamp it `candidate`" shortcut
  that applies to other unpublished matches — it goes through Step 4 and
  classification like a fresh candidate, and *that* determines its outcome.
- Also corrected the `import_status` "published" check while in the area:
  `"Merged into submission ..."` is a real, observed value (confirmed live
  in `research_findings`, dated 2026-08-05/07) meaning the row was folded
  into a `pending_submissions` card — staged, not published — alongside the
  existing `"Queued for approval"` / `"Held for review"` prefixes. The
  `"Ingested"` prefix is noted as a legacy, pre-`pending_submissions` path
  (all observed rows dated 2026-07-23/24, before `runResearchFindingsMigration`
  v11 moved candidate promotion to the `pending_submissions` review queue).

## v18 (2026-08-06)

Reconciliation pass between this master prompt and the installed skill
(`~/.claude/skills/orbis-dei-discovery/`) — the two had drifted in both
directions since v16/v17. See the "Known Gotchas" entry in `CLAUDE.md` for how
this was found (a `research_backlog` row for "St. Dominic" got stuck because
the installed skill was still gating on `status` text instead of the v16
`completed_at` column).

- **Master prompt → skill:** the skill's Step 0 query and end-of-run backlog
  write were still on the old `status`-text gate (`status NOT LIKE
  'Completed%'`) rather than v16's `completed_at IS NULL` column, and the
  skill's Step 2 was missing v17's broad-discovery-before-verification
  requirement entirely. Both are now ported into `SKILL.md` and
  `references/database-interaction.md` — no prompt-body change here, since the
  prompt already had them; this was a skill-side fix.
- **Skill → master prompt (this file):** the skill's
  `references/database-interaction.md` had two fixes never carried over here:
  (1) `import_status` only means "published" when it *begins with*
  `"Ingested"` — a non-null value alone isn't enough, since `"Queued for
  approval at ..."` and `"Held for review — ..."` are both non-null but mean
  the row is still mid-pipeline. Step 3's "sites match" paragraph and the
  Database Interaction "Determine whether... already been published"
  paragraph now both use the prefix test. (2) The Step 3 `UPDATE
  research_findings` pattern now includes an additive/union-only `tags`
  clause, so a Step 5 secondary-topic tag (or any newly-supported tag) can
  actually be added to an already-staged row — previously only `description`,
  `street_address`, `site_type`, `confidence`, and `status` were updatable.
  This was used ad hoc during the 2026-08-05 session to fix the "Cave of St.
  Ignatius" (Manresa) entry; it's now a documented part of the pattern instead
  of a one-off.

## v17 (2026-08-05)

- **Step 2 now requires a broad "discovery" query before any per-site "verification" query.** Root-caused from a real miss: a run on "St. Andrew the Apostle" shipped 5 sites and silently missed at least 5 more (including a documented foot relic at a monastery in Kefalonia), because every Step 2 search that run — English and native-language alike — was built around a site name Step 1 had already recalled (`"St. Andrew relics Patras Basilica"`, `"St. Andrew's Church Kyiv"`, etc.). That style of query can only flesh out a site already in mind; it cannot structurally surface one Step 1's memory never named. Step 2 and the native-language-pass paragraph both now call out this distinction explicitly and require a generic query ("relics of [saint] locations," "where is [saint] venerated") to run before the per-site ones, in both English and the native-language pass — not just once, in whichever language happens to come first.

## v16 (2026-08-04)

- **`research_backlog` gets a structured `completed_at` column.** Step 0's selection query and the completion write now use `completed_at IS NULL` / `completed_at = COALESCE(completed_at, now())` instead of pattern-matching `status NOT LIKE 'Completed%'`. `status` is unchanged — still the free-text, append-only human log (including curator overrides) — it just no longer doubles as the gate that decides whether a row gets picked again. Backfilled for all pre-existing rows from the timestamp embedded in their `status` text.

## v15 (2026-07-29)

- **Descriptions must not repeat generic topic facts.** Description style guide now says not to restate facts that belong to the topic in general (a saint's canonization date, overall cause of fame, where/how they were later martyred) on every site tied to that topic — that's the topic page's job. A fact is still fair game when it's specific to what happened *at that site* (e.g. the site of a martyr's actual killing should describe how they died there).
- **`source_links` must not link the topic's/person's own Wikipedia article.** Only the specific site's own Wikipedia article (if a distinct one exists) belongs in `source_links` — a saint's birthplace or martyrdom site no longer inherits the saint's own Wikipedia link just because it was consulted for context.

## v14 (2026-07-26)

- **Token streamlining, no new rules.** Removed the in-prompt changelog (now this file). Rules that were stated three to five times are consolidated to at most two statements (one canonical, one short pointer): the unpublished-match-gets-an-UPDATE rule, the street_address/wikipedia_image_candidates "not carried into sites" notes, the accent-insensitive sweep requirement (the Gesù anecdote now told once), the name-match-needs-country-corroboration rule, and the seeded-topics handling. The three near-identical inventory SELECTs are merged into one block with three WHERE variants.
- **Fixed two stale references:** Step 0 pointed to a nonexistent "Step 0 of the Database Interaction section" (now points to the Seeded topics paragraph); Step 5.1 referenced a `proposed_description` field that was never defined (proposed_modifications reuse `description`).

## v13 (2026-07-26)

- **Added `site_type` classification** (Site Type Classification section, Output Fields) — every qualifying site is classified as exactly one of `active-church` / `active-community` / `other-religious` / `heritage`, using a strict decision order (community trumps church; activity trumps denomination). Unlike `street_address`/`wikipedia_image_candidates`, this value IS carried into the public record: the migration script writes it to `sites.type`. Replaces the old "Active Churches" tag — the prompt must not propose or assign a `churches` tag.

## v12 (2026-07-25/26)

- **Fixed a dead-end in Step 3's deduplication logic.** A `research_findings` row could previously be logged as `duplicate`, `excluded`, or `proposed_modification` against something that was itself never published to `sites` — a dead end with no automated path forward, since none of those statuses is ever picked up by the migration script's site-creation step. This is exactly what happened to Église Sainte-Catherine de Fierbois: the "Joan of Arc" run and, three hours later, the "St. Catherine of Alexandria" run (seeded by the first) both produced valid, well-researched entries for the same church, and neither one ever wrote a `candidate` row — it took a human noticing weeks later to actually create the site. Step 3 now uses one simple rule: a match against anything not yet published is handled by modifying that `research_findings` row directly — never by writing a second, competing entry — and it stays (or becomes) a `candidate` so the migration script will create it. When two runs' research disagrees on confidence, the lower always wins.
- **Added `wikipedia_image_candidates` capture** (superseding the single `wikipedia_image_url` of the original v12 draft) — one candidate lead image per language-Wikipedia article consulted for a site. The migration script auto-picks one (native-language wiki preferred, else English); the rest stay on record for a human to swap in later.
- **Fixed the `name`/`native_name` bug that left `native_name` null on 109 of 110 rows.** The old `name` instruction ("if a site is known in English by a local name, use that") let the model default to the native name verbatim, at which point `native_name` stayed blank by the letter of its own rule. The Name formatting section spells out the translation requirement plus formatting conventions settled by hand-reviewing all 110 existing rows.
- **Hardened Step 3's name matching.** Plain `ILIKE` isn't diacritic-insensitive (`'%gesu%'` doesn't match `'Gesù'`) — how the same church got logged twice from two topic runs. The keyword sweep must run accent-insensitively; sites surfaced fresh in Step 2 get their own re-check; and name similarity alone is never enough — country (or a documented connection) must corroborate.

## v11 and earlier

See git history.
