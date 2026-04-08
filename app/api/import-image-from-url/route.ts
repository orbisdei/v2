import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { importImageFromUrl } from '@/lib/imageImport';

export async function POST(req: NextRequest) {
  // Auth check — contributor or administrator
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { url?: unknown; entity_type?: unknown; entity_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, entity_type, entity_id } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  if (entity_type !== 'site' && entity_type !== 'tag') {
    return NextResponse.json({ error: 'entity_type must be "site" or "tag"' }, { status: 400 });
  }
  if (!entity_id || typeof entity_id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(entity_id)) {
    return NextResponse.json({ error: 'Invalid entity_id format' }, { status: 400 });
  }

  try {
    const result = await importImageFromUrl(url, entity_type, entity_id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
