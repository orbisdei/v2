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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/site/${slug}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? null;

  if (!role || !['contributor', 'administrator'].includes(role)) {
    redirect(`/site/${slug}`);
  }

  const site = await getSiteBySlug(slug);
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
