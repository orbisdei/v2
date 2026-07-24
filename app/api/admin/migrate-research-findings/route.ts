import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { runResearchFindingsMigration } from '@/lib/migrateResearchFindings';

// Geocoding + 1.1s Nominatim pacing can push a batch past the default timeout.
export const maxDuration = 60;

/**
 * POST — admin-session auth (profiles.role === 'administrator'). Called by the
 * admin panel "Research Import" button. Body: { dryRun?: boolean; limit?: number }.
 * Defaults to a dry run; callers must send dryRun:false to write.
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

  let body: { dryRun?: boolean; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults apply
  }

  try {
    const result = await runResearchFindingsMigration(createServiceClient(), {
      dryRun: body.dryRun ?? true,
      limit: typeof body.limit === 'number' ? body.limit : undefined,
    });
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

  try {
    const result = await runResearchFindingsMigration(createServiceClient(), {
      dryRun: false,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
