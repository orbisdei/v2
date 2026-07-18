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
  // Local JWT verification (see proxy.ts) — avoids an auth-server round trip.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect(`/tag/${slug}`);
  }

  // The role lookup and the tag fetch are independent — run them together.
  const [{ data: profile }, tag] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    getTagBySlug(slug),
  ]);

  const role = profile?.role ?? null;

  if (!role || !['contributor', 'administrator'].includes(role)) {
    redirect(`/tag/${slug}`);
  }

  if (!tag) notFound();

  const isLocation = LOCATION_TYPES.includes(tag.type ?? '');

  // Contributors can only edit topic tags
  if (role === 'contributor' && isLocation) {
    redirect(`/tag/${slug}`);
  }

  // Pending-edit check, creator attribution, and links all depend only on the
  // resolved tag — one parallel batch.
  const [{ data: pending }, creatorName, initialLinks] = await Promise.all([
    supabase
      .from('pending_submissions')
      .select('id')
      .eq('type', 'tag')
      .eq('action', 'edit')
      .eq('submitted_by', userId)
      .eq('status', 'pending')
      .filter('payload->>tag_id', 'eq', tag.id)
      .limit(1),
    tag.created_by ? getCreatorName(tag.created_by) : Promise.resolve(null),
    getTagLinks(tag.id),
  ]);
  const hasPendingEdit = !!(pending && pending.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <EditTagClient
        tag={tag}
        userRole={role}
        userId={userId}
        creatorName={creatorName}
        hasPendingEdit={hasPendingEdit}
        initialLinks={initialLinks}
      />
    </div>
  );
}
