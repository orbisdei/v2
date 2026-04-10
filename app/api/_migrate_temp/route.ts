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

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  const results: Array<{ id: number; label: string; status: string; detail?: string }> = [];

  for (const m of MIGRATIONS) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: m.sql }),
        }
      );

      const body = await res.json().catch(() => res.text());
      if (res.ok) {
        results.push({ id: m.id, label: m.label, status: 'OK' });
      } else {
        results.push({ id: m.id, label: m.label, status: 'ERROR', detail: JSON.stringify(body) });
      }
    } catch (e: any) {
      results.push({ id: m.id, label: m.label, status: 'EXCEPTION', detail: e.message });
    }
  }

  return NextResponse.json({ results });
}
