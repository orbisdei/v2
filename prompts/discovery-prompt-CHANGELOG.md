# Discovery Prompt — Changelog

Version history for `orbisdei-discovery-prompt-v*.MD`. Moved out of the prompt
itself as of v14 — the model doesn't need version history at runtime, and every
rule the changelog explains is (and must remain) stated in the prompt body.

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
