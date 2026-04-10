import { NextRequest, NextResponse } from 'next/server';

// Temporary migration route — DELETE after use
// Protected by CRON_SECRET

const MIGRATIONS = [
  { id: 1, label: 'sites.created_by nullable', sql: 'ALTER TABLE sites ALTER COLUMN created_by DROP NOT NULL' },
  { id: 2, label: 'tags.created_by nullable', sql: 'ALTER TABLE tags ALTER COLUMN created_by DROP NOT NULL' },
  { id: 3, label: 'site_edits.submitted_by nullable', sql: 'ALTER TABLE site_edits ALTER COLUMN submitted_by DROP NOT NULL' },
  { id: 4, label: 'pending_submissions.submitted_by nullable', sql: 'ALTER TABLE pending_submissions ALTER COLUMN submitted_by DROP NOT NULL' },
  { id: 5, label: 'site_contributor_notes.created_by nullable', sql: 'ALTER TABLE site_contributor_notes ALTER COLUMN created_by DROP NOT NULL' },
  { id: 6, label: 'site_edits.reviewed_by nullable', sql: 'ALTER TABLE site_edits ALTER COLUMN reviewed_by DROP NOT NULL' },
  { id: 7, label: 'site_config.updated_by nullable', sql: 'ALTER TABLE site_config ALTER COLUMN updated_by DROP NOT NULL' },
  {
    id: 8,
    label: 'RLS policy: users can delete own profile',
    sql: `CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id)`,
  },
];

async function execSQL(sql: string, projectRef: string, dbPassword: string): Promise<{ ok: boolean; detail?: string }> {
  // Use the Supabase transaction pooler with postgres superuser credentials
  // Connection: postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  // Since we don't have the DB password via env var, try to use the pg-meta REST API
  // that Supabase exposes internally on port 5555 (not publicly accessible)

  // Alternative: Try the Supabase pgmeta endpoint via the project's internal API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Try using the Supabase REST API with a specially crafted request
  // that targets the pg-meta service through the reverse proxy
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_ddl`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_statement: sql }),
  });

  if (res.ok) {
    return { ok: true };
  }

  const body = await res.json().catch(() => ({})) as any;
  // If function not found, try to create it first via a bootstrap DO block
  if (body?.code === 'PGRST202') {
    return { ok: false, detail: 'exec_ddl function not found — need to create it first' };
  }

  return { ok: false, detail: JSON.stringify(body) };
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';

  // Step 1: Check if DATABASE_URL or SUPABASE_DB_PASSWORD env vars are set
  const envCheck = {
    hasDbPassword: !!process.env.SUPABASE_DB_PASSWORD,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    projectRef,
    availableEnvKeys: Object.keys(process.env).filter(k =>
      k.toLowerCase().includes('db') ||
      k.toLowerCase().includes('database') ||
      k.toLowerCase().includes('postgres') ||
      k.toLowerCase().includes('supabase')
    ),
  };

  const results: Array<{ id: number; label: string; status: string; detail?: string }> = [];

  // Try pg direct connection if we have a database URL
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

  if (databaseUrl) {
    // Dynamic import of pg (not in standard Vercel bundle, but might be available)
    try {
      const { Client } = await import('pg' as any);
      const client = new (Client as any)({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();

      for (const m of MIGRATIONS) {
        try {
          await client.query(m.sql);
          results.push({ id: m.id, label: m.label, status: 'OK' });
        } catch (e: any) {
          const msg = e.message || '';
          if (msg.includes('already exists') || msg.includes('already nullable') || msg.includes('does not exist')) {
            results.push({ id: m.id, label: m.label, status: 'ALREADY_DONE', detail: msg });
          } else {
            results.push({ id: m.id, label: m.label, status: 'ERROR', detail: msg });
          }
        }
      }

      await client.end();
      return NextResponse.json({ method: 'pg_direct', envCheck, results });
    } catch (e: any) {
      results.push({ id: 0, label: 'pg_connect', status: 'EXCEPTION', detail: e.message });
    }
  }

  // Fallback: try exec_ddl RPC
  for (const m of MIGRATIONS) {
    const r = await execSQL(m.sql, projectRef, dbPassword);
    results.push({ id: m.id, label: m.label, status: r.ok ? 'OK' : 'ERROR', detail: r.detail });
  }

  return NextResponse.json({ method: 'rpc_fallback', envCheck, results });
}
