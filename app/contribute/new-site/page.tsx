import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import ContributeClient from './ContributeClient';
import { getAllTags } from '@/lib/data';

export const metadata = { title: 'Contribute — Orbis Dei' };

export default async function NewSitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? 'general';
  if (role !== 'contributor' && role !== 'administrator') redirect('/');

  const allTags = await getAllTags();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ContributeClient allTags={allTags} userRole={role} />
    </div>
  );
}
