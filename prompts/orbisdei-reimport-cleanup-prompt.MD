# Orbis Dei — Reimport & Data-Cleanup Prompt (for a Claude Code session with app-repo access)

## Why this exists

This Cowork session only has access to Supabase (project `vrnzirtvplbfxepgidhr`) and the
`orbisdei-discovery-prompt.MD` docs folder — it does **not** have the actual orbisdei
application/import-script repo. During a MiracleHunter re-audit, we found and partially fixed
a real staleness bug: `pending_submissions.payload` is a one-time JSONB export snapshot of
`research_findings`, not a live view. Editing `research_findings` after export does **not**
update the review card shown at `/admin/research`. Run this prompt from a Claude Code session
that has the app repo checked out, so it can find and safely re-run the actual migration script.

## What's already been cleaned up in Supabase (do not redo)

- 2 `proposed_modification` rows (Cathedral of Our Lady of Puy / Le Puy, Sanctuary of St.
  Michael the Archangel) had `description` holding only a delta instead of full merged text —
  fixed in both `research_findings` and their `pending_submissions.payload` snapshots.
- 5 true-duplicate `candidate` pairs (Candelaria, Ocotlán, Virgen del Camino, Guadalupe,
  Cotignac) — the better copy was kept and enriched, the inferior `research_findings` row
  deleted, and its corresponding `pending_submissions` row set to `status='rejected'`
  (not hard-deleted — this Supabase connection's DELETE permission on `pending_submissions`
  was blocked by a tool-safety classifier, so rejection was used instead; functionally
  equivalent for keeping it out of the 318-item pending queue).
- ~106 sites got real `street_address` values backfilled onto `research_findings` earlier this
  session, meant to feed more accurate geocoding on next import.

## What is NOT yet done (do this first, before any reimport)

1. **Agnes of Montepulciano** (`research_findings` id `5b624931-...`, `pending_submissions` id
   `e67a0d6e-97e0-49d9-8440-cd7684344930`) — the pending_submissions payload still has the OLD
   wrong municipality (Orvieto), a Wikipedia link/image for an unrelated Rome church
   (Sant'Agnese in Agone), and coordinates pinned to Orvieto. Correct Wikipedia article:
   `it.wikipedia.org/wiki/Chiesa_di_Sant'Agnese_(Montepulciano)`. Needs manual payload fix or
   a reimport that regenerates it from the corrected `research_findings` row.
2. **Sanctuary of Our Lady of Basella** (`research_findings` id `99f400c1-...`,
   `pending_submissions` id `b9c4c8c9-ed17-45cd-88e0-400feb7ecb1c`) — payload still has the old
   pre-rename name ("Madonna dell'Olmo") and wrong Wikipedia link. Correct link:
   `Santuario_Madonna_della_Basella`; correct coordinates: 45°36'48.283"N, 9°43'38.168"E.
3. **3 legitimate name collisions** need disambiguating titles before reimport, or the
   migration script may merge/overwrite the wrong pair:
   - "St. Andrew's Church" (Kyiv vs. Cologne)
   - "Sanctuary of Our Lady of Grace" (Leini vs. Torre di Ruggiero)
   - "Sanctuary of Our Lady of the Woods" (Imbersago vs. Ozegna)
4. A handful of other `proposed_modification`/edited rows may have the same stale-snapshot
   issue as Le Puy/Michael on a smaller scale (description text edited in `research_findings`
   after their `pending_submissions` row was already exported). Worth a systematic diff before
   reimport: join on `research_findings.name = pending_submissions.payload->>'name'` and compare
   `description` vs `payload->>'short_description'`.

## Task for this Claude Code session

1. Locate the import/migration script in the app repo (search for code that reads
   `research_findings` or writes `pending_submissions`/`sites`, likely referencing
   `street_address`, `google_maps_url_override`, or a geocoding API call — the discovery
   prompt confirms `street_address` "exists purely to feed the migration script's geocoder").
2. Read it before running anything. Confirm: does it re-export ALL eligible
   `research_findings` rows, or only new/changed ones? Does it skip rows that already have a
   `pending_submissions` row, or does it create a duplicate? This determines whether a full
   rerun is safe or will recreate the duplicate-card problem we just cleaned up.
3. Fix items 1–3 above in `research_findings` first (or confirm the script will regenerate
   correct payloads for them automatically once run).
4. Run the script scoped to just the rows touched this session first (Le Puy, Michael, the 5
   merged duplicates, Agnes, Basella) as a smoke test before doing a full reimport.
5. **Do not blanket-delete `pending_submissions` rows with `status='approved'` or
   `status='rejected'`** — those represent real review history and, for `approved`, likely
   correspond to live `sites` records. "Removing all the old garbage" should mean stale
   `pending` snapshots that no longer match their source `research_findings` row, not the
   full review history.
6. After reimport, spot-check that `google_maps_url` on a few affected `sites` rows now
   reflects the more precise `street_address`-based geocode rather than a town-centroid pin.

## Known limitation

This session could not access the app repo to identify the script by name/path — confirmed via
a failed `Glob` outside connected folders. Steps above are the diagnostic path to find it, not
a known file path.
