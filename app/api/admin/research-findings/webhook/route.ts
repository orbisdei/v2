import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runResearchFindingsMigration } from '@/lib/migrateResearchFindings';

// One row's enrichment chain is several sequential external calls, including
// Nominatim's mandatory ~1.1s pacing — comfortably past Vercel's 10s default.
// Matches the batch route (/api/admin/migrate-research-findings), which sets
// this for exactly the same reason.
export const maxDuration = 60;

/**
 * POST — Supabase Database Webhook target, configured to fire on every
 * INSERT into research_findings. Event-driven counterpart to
 * ResearchImportPanel's manual batch button: instead of waiting for someone
 * to click "Import", a newly-written row gets enrichment + pending_submissions
 * promotion run for it automatically, the moment it exists — whether it came
 * from the Discovery pipeline, a manual insert, or anywhere else.
 *
 * Scoped to exactly the one new row (findingIds: [id]) rather than the whole
 * backlog. Reason: Vercel Hobby's ~10s function timeout. A single row's
 * enrichment chain (geocode, reverse-geocode, native-name backfill, the two
 * Wikipedia lookups) is a handful of sequential, paced external calls that
 * normally finishes in a few seconds; a multi-row batch could not reliably.
 * Worst case — Google Places misses/unconfigured (forcing both paced
 * Nominatim calls), plus a full native-name + Wikipedia backfill chain with
 * nothing already captured to short-circuit any of it — can still approach
 * the timeout. If that happens the row simply stays unprocessed
 * (import_status left null): it gets picked up by the next manual "Research
 * Import" sweep, or a Supabase webhook retry, rather than silently lost.
 *
 * Auth: shared secret (CRON_SECRET), read from the `x-webhook-secret` header
 * if present, else the `?secret=` query param that mark-no-image and the
 * backfill routes use. The header is preferred and is what the DB trigger
 * sends: query strings routinely end up in CDN/proxy/access logs, and a raw
 * secret concatenated into a URL also has to be URL-encoded to survive
 * characters like + & #. The query param stays supported so an already-
 * configured caller doesn't break.
 *
 * Uses the raw supabase-js client with the service role key directly rather
 * than utils/supabase/server's createServiceClient — this route has no user
 * session/cookies at all (a server-to-server call from Supabase), and
 * createServiceClient is documented elsewhere in this codebase as NOT truly
 * bypassing RLS (it reads auth cookies via @supabase/ssr, which override the
 * service role key when present). research_findings has no RLS policies at
 * all — service-role-only by design — so this needs a guaranteed bypass,
 * the same way mark-no-image's cron-secret route already does it.
 *
 * runResearchFindingsMigration's own status filters (candidate vs
 * proposed_modification) decide what actually happens with the row; this
 * route doesn't need to branch on the webhook payload's status itself.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret') ?? req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { record?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = body.record?.id;
  if (!id) {
    return NextResponse.json({ error: 'Missing record.id in webhook payload' }, { status: 400 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await runResearchFindingsMigration(service, { dryRun: false, findingIds: [id] });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
