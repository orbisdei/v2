import { NextRequest, NextResponse } from 'next/server';
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

  const { tag_id, name, description, image_url, featured, dedication } = body;

  if (!tag_id || typeof tag_id !== 'string') {
    return NextResponse.json({ error: 'Missing tag_id' }, { status: 400 });
  }

  // Build update payload from only the provided fields
  const update: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 300) {
      return NextResponse.json({ error: 'Invalid name (1–300 chars)' }, { status: 400 });
    }
    update.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || description.length > 5000) {
      return NextResponse.json({ error: 'description too long (max 5000 chars)' }, { status: 400 });
    }
    update.description = description;
  }

  if (image_url !== undefined) {
    if (image_url !== null && typeof image_url !== 'string') {
      return NextResponse.json({ error: 'Invalid image_url' }, { status: 400 });
    }
    update.image_url = image_url || null;
  }

  if (featured !== undefined) {
    if (typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'featured must be a boolean' }, { status: 400 });
    }
    update.featured = featured;
  }

  if (dedication !== undefined) {
    if (dedication !== null && (typeof dedication !== 'string' || dedication.length > 280)) {
      return NextResponse.json({ error: 'dedication too long (max 280 chars)' }, { status: 400 });
    }
    update.dedication = dedication || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from('tags').update(update).eq('id', tag_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
