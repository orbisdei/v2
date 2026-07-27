import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import ResearchClient, { type ResearchFindingRow } from './ResearchClient';

// research_findings has no RLS policies (service-role pipeline writes only),
// so the initial load goes through the service client after the session is
// verified as administrator here — same shape as app/admin/page.tsx.
const SELECT_COLUMNS =
  'id,name,native_name,description,country,municipality,street_address,interest,tags,' +
  'existing_site_name,current_short_description,change_summary,source_links,celebrations,' +
  'wikipedia_image_url,wikipedia_image_url_override,google_maps_url_override,site_type,' +
  'status,confidence,confidence_reason,exclusion_reason,run_topic,run_region,category,' +
  'reviewed,approved,import_status,site_id,created_at';

export default async function ResearchBacklogPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) notFound();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (profile?.role !== 'administrator') notFound();

  const service = createServiceClient();
  const { data } = await service
    .from('research_findings')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <ResearchClient initialRows={(data ?? []) as unknown as ResearchFindingRow[]} />
    </div>
  );
}
