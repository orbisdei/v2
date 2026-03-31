import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getTagBySlug, getCreatorName, getTagLinks } from '@/lib/data';
import Header from '@/components/Header';
import EditTagClient from './EditTagClient';

const LOCATION_TYPES = ['country', 'region', 'municipality'];

export default async function EditTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/tag/${slug}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? null;

  if (!role || !['contributor', 'administrator'].includes(role)) {
    redirect(`/tag/${slug}`);
  }

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const isLocation = LOCATION_TYPES.includes(tag.type ?? '');

  // Contributors can only edit topic tags
  if (role === 'contributor' && isLocation) {
    redirect(`/tag/${slug}`);
  }

  // Check for pending edit by this user
  let hasPendingEdit = false;
  const { data: pending } = await supabase
    .from('pending_submissions')
    .select('id')
    .eq('type', 'tag')
    .eq('action', 'edit')
    .eq('submitted_by', user.id)
    .eq('status', 'pending')
    .filter('payload->>tag_id', 'eq', tag.id)
    .limit(1);
  hasPendingEdit = !!(pending && pending.length > 0);

  const [creatorName, initialLinks] = await Promise.all([
    tag.created_by ? getCreatorName(tag.created_by) : Promise.resolve(null),
    getTagLinks(tag.id),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <EditTagClient
        tag={tag}
        userRole={role}
        userId={user.id}
        creatorName={creatorName}
        hasPendingEdit={hasPendingEdit}
        initialLinks={initialLinks}
      />
    </div>
  );
}
