import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import AdminClient from './AdminClient';
import { getAllTagsWithCounts, getAllSitesAdmin } from '@/lib/data';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') notFound();

  // Fetch pending submissions with submitter display names
  const { data: rawSubmissions } = await supabase
    .from('pending_submissions')
    .select('*, profiles!submitted_by(display_name)')
    .eq('status', 'pending')
    .order('created_at');

  const submissions = (rawSubmissions ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as 'site' | 'tag' | 'note',
    action: row.action as 'create' | 'edit',
    payload: row.payload as Record<string, unknown>,
    submitted_by: row.submitted_by as string,
    submitter_name: (row.profiles as { display_name: string } | null)?.display_name ?? 'Unknown',
    created_at: row.created_at as string,
    status: row.status as 'pending',
  }));

  // Fetch all users, tags, and sites (admin view with image counts)
  const [{ data: users }, allTags, allSites] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, role, created_at').order('created_at'),
    getAllTagsWithCounts(),
    getAllSitesAdmin(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <AdminClient
        submissions={submissions}
        users={users ?? []}
        allTags={allTags}
        allSites={allSites}
      />
    </div>
  );
}
