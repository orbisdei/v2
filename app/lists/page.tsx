import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserLists } from '@/lib/data';
import Header from '@/components/Header';
import ListsClient from './ListsClient';

export const metadata = { title: 'My Lists — Orbis Dei' };

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const lists = await getUserLists();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ListsClient initialLists={lists} />
    </div>
  );
}
