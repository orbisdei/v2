import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSiteBySlug } from '@/lib/data';
import Header from '@/components/Header';
import EditSiteClient from './EditSiteClient';

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  // Local JWT verification (see proxy.ts) — avoids an auth-server round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect(`/site/${slug}`);
  }

  // The role lookup and the site fetch are independent — run them together.
  const [{ data: profile }, site] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    getSiteBySlug(slug),
  ]);

  const role = profile?.role ?? null;

  if (!role || !['contributor', 'administrator'].includes(role)) {
    redirect(`/site/${slug}`);
  }

  if (!site) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <EditSiteClient site={site} userRole={role} />
    </div>
  );
}
