/**
 * cleanup-duplicate-location-tags.ts
 *
 * Finds topic tags that duplicate location tags (by name) and migrates all
 * site_tag_assignments from the old topic tag to the matching location tag,
 * then deletes the now-unused topic tag.
 *
 * HOW TO RUN:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/cleanup-duplicate-location-tags.ts
 *
 * DRY RUN (logs what it would do, no writes):
 *   DRY_RUN=true npx tsx scripts/cleanup-duplicate-location-tags.ts
 *
 * REQUIRES:
 *   Run AFTER backfill-location-tags.ts so location tags already exist.
 *   SUPABASE_URL — your project URL (https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://vrnzirtvplbfxepgidhr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybnppcnR2cGxiZnhlcGdpZGhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY5NjQ0NywiZXhwIjoyMDg5MjcyNDQ3fQ.f8bQ_2oTR4vqL7sJtxFcXvAxKVudEHKjDbPRpx_CNMA';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tag {
  id: string;
  name: string;
  type: string;
}

interface Assignment {
  site_id: string;
  tag_id: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (DRY_RUN) console.log('[DRY RUN] No writes will be made.\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Fetch all topic tags
  const { data: topicTags, error: topicErr } = await supabase
    .from('tags')
    .select('id, name, type')
    .eq('type', 'topic');

  if (topicErr) {
    console.error('Failed to fetch topic tags:', topicErr.message);
    process.exit(1);
  }

  // Fetch all location tags
  const { data: locationTags, error: locErr } = await supabase
    .from('tags')
    .select('id, name, type')
    .in('type', ['country', 'region', 'municipality']);

  if (locErr) {
    console.error('Failed to fetch location tags:', locErr.message);
    process.exit(1);
  }

  console.log(`Found ${topicTags.length} topic tags, ${locationTags.length} location tags.\n`);

  // Build a map: lowercase name → all location tags with that name
  const locationByName = new Map<string, Tag[]>();
  for (const tag of locationTags as Tag[]) {
    const key = tag.name.toLowerCase();
    const existing = locationByName.get(key) ?? [];
    existing.push(tag);
    locationByName.set(key, existing);
  }

  // Stats
  let totalMigrated = 0;
  let totalDeleted = 0;
  let totalSkippedAmbiguous = 0;
  let totalSkippedNoMatch = 0;

  for (const topicTag of topicTags as Tag[]) {
    const key = topicTag.name.toLowerCase();
    const matches = locationByName.get(key);

    if (!matches || matches.length === 0) {
      totalSkippedNoMatch++;
      continue;
    }

    // Ambiguous: multiple location tags share this name (e.g., "Rome" in two countries)
    if (matches.length > 1) {
      console.warn(
        `AMBIGUOUS: Topic tag "${topicTag.name}" (${topicTag.id}) matches ${matches.length} location tags:`
      );
      for (const m of matches) {
        console.warn(`  - "${m.name}" (${m.id}, type: ${m.type})`);
      }
      console.warn(`  → Skipping. Resolve manually.\n`);
      totalSkippedAmbiguous++;
      continue;
    }

    const locationTag = matches[0];

    // Fetch all assignments pointing to the old topic tag
    const { data: oldAssignments, error: assignErr } = await supabase
      .from('site_tag_assignments')
      .select('site_id, tag_id')
      .eq('tag_id', topicTag.id);

    if (assignErr) {
      console.error(
        `  ERROR fetching assignments for topic tag "${topicTag.id}":`,
        assignErr.message
      );
      continue;
    }

    const siteCount = (oldAssignments as Assignment[]).length;

    if (siteCount === 0) {
      // No sites assigned — just delete the orphan tag
      console.log(
        `Deleting unused topic tag "${topicTag.name}" (${topicTag.id}) — no sites assigned, ` +
          `matches location tag "${locationTag.name}" (${locationTag.id}).`
      );
      if (!DRY_RUN) {
        const { error: deleteTagErr } = await supabase
          .from('tags')
          .delete()
          .eq('id', topicTag.id);
        if (deleteTagErr) {
          console.error(`  ERROR deleting tag "${topicTag.id}":`, deleteTagErr.message);
        } else {
          totalDeleted++;
        }
      } else {
        totalDeleted++;
      }
      continue;
    }

    console.log(
      `Migrating tag "${topicTag.name}" (${topicTag.id}, topic) → ` +
        `"${locationTag.name}" (${locationTag.id}, ${locationTag.type}): ${siteCount} site(s) to reassign`
    );

    if (!DRY_RUN) {
      // Fetch existing assignments for the location tag so we can skip duplicates
      const { data: existingLocAssignments, error: existingErr } = await supabase
        .from('site_tag_assignments')
        .select('site_id')
        .eq('tag_id', locationTag.id);

      if (existingErr) {
        console.error(
          `  ERROR fetching existing assignments for location tag "${locationTag.id}":`,
          existingErr.message
        );
        continue;
      }

      const alreadyAssigned = new Set(
        (existingLocAssignments as { site_id: string }[]).map((r) => r.site_id)
      );

      let reassigned = 0;
      let skippedAlreadyExists = 0;
      let deletedOld = 0;

      for (const row of oldAssignments as Assignment[]) {
        // Insert new assignment if not already present
        if (!alreadyAssigned.has(row.site_id)) {
          const { error: insertErr } = await supabase
            .from('site_tag_assignments')
            .insert({ site_id: row.site_id, tag_id: locationTag.id });

          if (insertErr) {
            console.error(
              `  ERROR inserting assignment (${row.site_id} → ${locationTag.id}):`,
              insertErr.message
            );
            continue;
          }
          reassigned++;
        } else {
          skippedAlreadyExists++;
        }

        // Delete old assignment
        const { error: deleteAssignErr } = await supabase
          .from('site_tag_assignments')
          .delete()
          .eq('site_id', row.site_id)
          .eq('tag_id', topicTag.id);

        if (deleteAssignErr) {
          console.error(
            `  ERROR deleting old assignment (${row.site_id} → ${topicTag.id}):`,
            deleteAssignErr.message
          );
        } else {
          deletedOld++;
        }
      }

      console.log(
        `  Inserted ${reassigned} new assignments, ` +
          `${skippedAlreadyExists} already existed, ` +
          `${deletedOld} old assignments removed.`
      );

      // Verify no remaining assignments before deleting the tag
      const { data: remaining, error: remainingErr } = await supabase
        .from('site_tag_assignments')
        .select('site_id')
        .eq('tag_id', topicTag.id);

      if (remainingErr) {
        console.error(
          `  ERROR checking remaining assignments for "${topicTag.id}":`,
          remainingErr.message
        );
        continue;
      }

      if ((remaining as { site_id: string }[]).length > 0) {
        console.warn(
          `  WARNING: ${remaining.length} assignment(s) still point to topic tag "${topicTag.id}" — NOT deleting tag.`
        );
        continue;
      }

      const { error: deleteTagErr } = await supabase
        .from('tags')
        .delete()
        .eq('id', topicTag.id);

      if (deleteTagErr) {
        console.error(`  ERROR deleting tag "${topicTag.id}":`, deleteTagErr.message);
      } else {
        console.log(`  Deleted topic tag "${topicTag.name}" (${topicTag.id}).`);
        totalDeleted++;
      }

      totalMigrated += reassigned;
    } else {
      // Dry run — still check for conflicts to give accurate preview
      const { data: existingLocAssignments } = await supabase
        .from('site_tag_assignments')
        .select('site_id')
        .eq('tag_id', locationTag.id);

      const alreadyAssigned = new Set(
        ((existingLocAssignments ?? []) as { site_id: string }[]).map((r) => r.site_id)
      );

      const toInsert = (oldAssignments as Assignment[]).filter(
        (r) => !alreadyAssigned.has(r.site_id)
      ).length;
      const alreadyExist = siteCount - toInsert;

      console.log(
        `  [DRY RUN] Would insert ${toInsert} new assignments ` +
          `(${alreadyExist} already exist), delete ${siteCount} old assignments, delete tag.`
      );
      totalMigrated += toInsert;
      totalDeleted++;
    }
  }

  console.log('\n--- Summary ---');
  if (DRY_RUN) console.log('[DRY RUN] No changes written.');
  console.log(`  Topic tags with no matching location tag:  ${totalSkippedNoMatch}`);
  console.log(`  Ambiguous matches (skipped, manual fix needed): ${totalSkippedAmbiguous}`);
  console.log(`  Site assignments migrated:                 ${totalMigrated}`);
  console.log(`  Topic tags deleted:                        ${totalDeleted}`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
