import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header';
import ContributeClient from './ContributeClient';
import { getAllTags } from '@/lib/data';

export const metadata = { title: 'Contribute — Orbis Dei' };

export default async function NewSitePage() {
  const supabase = await createClient();
  // Local JWT verification (see proxy.ts) — avoids an auth-server round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect('/');

  // The role lookup and the tag list are independent — run them together.
  const [{ data: profile }, allTags] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    getAllTags(),
  ]);

  const role = profile?.role ?? 'general';
  if (role !== 'contributor' && role !== 'administrator') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ContributeClient allTags={allTags} userRole={role} />
    </div>
  );
}
