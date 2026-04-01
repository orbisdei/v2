import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  // Verify the caller is an administrator
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden — administrators only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tag_id } = body;

  if (!tag_id || typeof tag_id !== 'string') {
    return NextResponse.json({ error: 'Missing tag_id' }, { status: 400 });
  }

  // Verify the tag is a topic tag (not a location tag — those are managed automatically)
  const { data: tag } = await supabase
    .from('tags')
    .select('type')
    .eq('id', tag_id)
    .single();

  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  if (['country', 'region', 'municipality'].includes(tag.type)) {
    return NextResponse.json({ error: 'Location tags cannot be deleted this way' }, { status: 400 });
  }

  const service = await createServiceClient();

  // Delete site_tag_assignments first (FK constraint)
  const { error: assignError } = await service
    .from('site_tag_assignments')
    .delete()
    .eq('tag_id', tag_id);

  if (assignError) {
    return NextResponse.json({ error: assignError.message }, { status: 500 });
  }

  // Delete the tag
  const { error: tagError } = await service.from('tags').delete().eq('id', tag_id);

  if (tagError) {
    return NextResponse.json({ error: tagError.message }, { status: 500 });
  }

  revalidatePath(`/tag/${tag_id}`);

  return NextResponse.json({ ok: true });
}
