import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST() {
  // 1. Get the authenticated user via cookie-based client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Block admin self-deletion
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'administrator') {
    return NextResponse.json(
      { error: 'Administrators cannot delete their own account. Please contact another admin to have your role changed first.' },
      { status: 403 }
    );
  }

  const uid = user.id;
  const admin = createAdminClient();

  try {
    // Step 1: Delete user_list_items for all lists owned by user
    const { data: lists } = await admin
      .from('user_lists')
      .select('id')
      .eq('user_id', uid);

    if (lists && lists.length > 0) {
      const listIds = lists.map((l: { id: string }) => l.id);
      const { error } = await admin
        .from('user_list_items')
        .delete()
        .in('list_id', listIds);
      if (error) throw { step: 1, error };
    }

    // Step 2: Delete user_lists
    {
      const { error } = await admin.from('user_lists').delete().eq('user_id', uid);
      if (error) throw { step: 2, error };
    }

    // Step 3: Delete visited_sites
    {
      const { error } = await admin.from('visited_sites').delete().eq('user_id', uid);
      if (error) throw { step: 3, error };
    }

    // Step 4: pending_submissions — delete pending, null out non-pending
    {
      const { error: e1 } = await admin
        .from('pending_submissions')
        .delete()
        .eq('submitted_by', uid)
        .eq('status', 'pending');
      if (e1) throw { step: 4, error: e1 };

      const { error: e2 } = await admin
        .from('pending_submissions')
        .update({ submitted_by: null })
        .eq('submitted_by', uid)
        .neq('status', 'pending');
      if (e2) throw { step: 4, error: e2 };
    }

    // Step 5: site_edits — delete pending, null out non-pending submitted_by, null out reviewed_by
    {
      const { error: e1 } = await admin
        .from('site_edits')
        .delete()
        .eq('submitted_by', uid)
        .eq('status', 'pending');
      if (e1) throw { step: 5, error: e1 };

      const { error: e2 } = await admin
        .from('site_edits')
        .update({ submitted_by: null })
        .eq('submitted_by', uid)
        .neq('status', 'pending');
      if (e2) throw { step: 5, error: e2 };

      const { error: e3 } = await admin
        .from('site_edits')
        .update({ reviewed_by: null })
        .eq('reviewed_by', uid);
      if (e3) throw { step: 5, error: e3 };
    }

    // Step 6: Delete site_contributor_notes
    {
      const { error } = await admin
        .from('site_contributor_notes')
        .delete()
        .eq('created_by', uid);
      if (error) throw { step: 6, error };
    }

    // Step 7: Null out created_by on sites
    {
      const { error } = await admin
        .from('sites')
        .update({ created_by: null })
        .eq('created_by', uid);
      if (error) throw { step: 7, error };
    }

    // Step 8: Null out created_by on tags
    {
      const { error } = await admin
        .from('tags')
        .update({ created_by: null })
        .eq('created_by', uid);
      if (error) throw { step: 8, error };
    }

    // Step 9: Null out updated_by on site_config
    {
      const { error } = await admin
        .from('site_config')
        .update({ updated_by: null })
        .eq('updated_by', uid);
      if (error) throw { step: 9, error };
    }

    // Step 10: Delete profile row
    {
      const { error } = await admin.from('profiles').delete().eq('id', uid);
      if (error) throw { step: 10, error };
    }

    // Step 11: Delete auth user
    {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) throw { step: 11, error };
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { step: number; error: { message?: string } };
    console.error(`delete-account: step ${err.step} failed`, err.error);
    return NextResponse.json(
      { error: `Deletion failed at step ${err.step}: ${err.error?.message ?? 'Unknown error'}` },
      { status: 500 }
    );
  }
}
