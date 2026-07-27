import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { runResearchFindingsMigration } from '@/lib/migrateResearchFindings';
import { SITES_TAG, TAGS_TAG } from '@/lib/data';

/** Bust the Next data cache for the catalog/tag queries after a run that wrote.
 *  A real run creates sites and/or auto-creates topic tags, so both the site
 *  catalog (getMapPins/getAllSites/getSitesByTag) and tag listings go stale
 *  until these fire — the same revalidation every other mutation route does. */
function revalidateAfterWrite(
  result: { dryRun: boolean; created: string[]; tagsCreated: string[] },
  force = false
) {
  // `force` (manual ?revalidate=1) busts the cache regardless — used to recover
  // when an earlier run wrote sites but its revalidation didn't reach this
  // environment (e.g. the initial import was driven from a local dev server, so
  // production's data cache stayed stale). Otherwise only revalidate when a run
  // actually wrote — the cron ticks over mostly-empty batches and blanket
  // revalidation on every tick would refetch the whole catalog needlessly.
  if (!force) {
    if (result.dryRun) return;
    if (result.created.length === 0 && result.tagsCreated.length === 0) return;
  }
  revalidateTag(SITES_TAG, 'max');
  revalidateTag(TAGS_TAG, 'max');
}

// Geocoding + 1.1s Nominatim pacing can push a batch past the default timeout.
export const maxDuration = 60;

/**
 * POST — admin-session auth (profiles.role === 'administrator'). Called by the
 * admin panel "Research Import" button (general sweep) AND by /admin/research's
 * per-row "Confirm" (single-row run) — same body shape as the GET/cron handler's
 * query params, just as a JSON body: { dryRun?: boolean; limit?: number;
 * findingIds?: string[] }. `findingIds` narrows to specific rows without
 * disturbing the normal created_at-ordered batch for everyone else (see
 * runResearchFindingsMigration's own doc comment). Defaults to a dry run;
 * callers must send dryRun:false to write.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { dryRun?: boolean; limit?: number; findingIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults apply
  }

  const findingIds = Array.isArray(body.findingIds)
    ? body.findingIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : undefined;

  try {
    const result = await runResearchFindingsMigration(createServiceClient(), {
      dryRun: body.dryRun ?? true,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
      findingIds: findingIds?.length ? findingIds : undefined,
    });
    revalidateAfterWrite(result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET — cron-secret auth, for Vercel Cron and the external discovery script.
 * Vercel Cron sends "Authorization: Bearer ${CRON_SECRET}" automatically;
 * a ?secret= query param is accepted for manual runs. Always executes for real
 * (no dryRun). Query params: ?limit=10.
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.nextUrl.searchParams.get('secret') ??
    req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // Optional targeted-run params (manual runs only; the cron sends neither):
  //   ?ids=<uuid>,<uuid>  — restrict to specific research_findings rows
  //   ?dryRun=1           — preview without writing (GET otherwise writes for real)
  const idsParam = req.nextUrl.searchParams.get('ids');
  const findingIds = idsParam
    ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const dryRunParam = req.nextUrl.searchParams.get('dryRun');
  const dryRun = dryRunParam === '1' || dryRunParam === 'true';
  // ?revalidate=1 — force a catalog/tag cache bust even on a no-write run.
  const forceRevalidate =
    req.nextUrl.searchParams.get('revalidate') === '1' ||
    req.nextUrl.searchParams.get('revalidate') === 'true';

  try {
    const result = await runResearchFindingsMigration(createServiceClient(), {
      dryRun,
      limit: Number.isFinite(limit) ? limit : undefined,
      findingIds,
    });
    revalidateAfterWrite(result, forceRevalidate);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
