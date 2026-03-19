import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import ImportClient from './ImportClient';
import { getAllTags } from '@/lib/data';

export const metadata = { title: 'Import Sites — Admin' };

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator') redirect('/admin');

  const allTags = await getAllTags();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ImportClient allTags={allTags} />
    </div>
  );
}
