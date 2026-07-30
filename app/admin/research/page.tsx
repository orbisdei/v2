import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getAllTagsWithCounts } from '@/lib/data';
import Header from '@/components/Header';
import ResearchClient, { type Submission } from './ResearchClient';

// This route still lives at /admin/research, but it's no longer a
// research_findings triage page — research_findings now promotes itself into
// pending_submissions automatically (see lib/migrateResearchFindings.ts v14 +
// the event-driven webhook), carrying its own advisory warnings along in
// payload.warnings. This page is a mobile-friendly reviewer over that SAME
// pending_submissions backlog the desktop Admin -> Pending Approvals tab
// shows — full SiteForm, warnings surfaced, Approve/Reject. The desktop tab
// is left as-is for now (slated to be retired once this page covers
// everything it does).
export default async function ResearchBacklogPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) notFound();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (profile?.role !== 'administrator') notFound();

  const [{ data: rawSubmissions }, allTags] = await Promise.all([
    supabase
      .from('pending_submissions')
      .select('*, profiles!submitted_by(display_name)')
      .eq('status', 'pending')
      .order('created_at'),
    getAllTagsWithCounts(),
  ]);

  const submissions: Submission[] = (rawSubmissions ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as 'site' | 'tag' | 'note',
    action: row.action as 'create' | 'edit',
    payload: row.payload as Record<string, unknown>,
    submitted_by: row.submitted_by as string,
    submitter_name: (row.profiles as { display_name: string } | null)?.display_name ?? 'Unknown',
    created_at: row.created_at as string,
    status: row.status as 'pending',
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <ResearchClient initialSubmissions={submissions} initialTags={allTags} />
    </div>
  );
}
