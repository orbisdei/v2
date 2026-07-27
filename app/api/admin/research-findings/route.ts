import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

// research_findings has no RLS policies at all (service-role pipeline writes
// only), so even an authenticated admin session can't read it directly —
// this route verifies the admin role via the session client, then reads with
// the service client. See lib/migrateResearchFindings.ts for the column
// semantics (status/confidence/import_status drive the automated pipeline).
const SELECT_COLUMNS =
  'id,name,native_name,description,country,municipality,street_address,interest,tags,' +
  'existing_site_name,current_short_description,change_summary,source_links,celebrations,' +
  'wikipedia_image_url,wikipedia_image_url_override,google_maps_url_override,site_type,' +
  'status,confidence,confidence_reason,exclusion_reason,run_topic,run_region,category,' +
  'reviewed,approved,import_status,site_id,created_at';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('research_findings')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: data ?? [] });
}
