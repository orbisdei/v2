import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { renameTagImage, isR2Url } from '@/lib/storage';

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

  const { tag_id, new_tag_id, name, description, image_url, image_attribution, featured, dedication } = body;

  if (!tag_id || typeof tag_id !== 'string') {
    return NextResponse.json({ error: 'Missing tag_id' }, { status: 400 });
  }

  // Validate new_tag_id if provided
  let targetId: string | null = null;
  if (new_tag_id !== undefined && new_tag_id !== null && new_tag_id !== tag_id) {
    if (typeof new_tag_id !== 'string' || !/^[a-z0-9-]+$/.test(new_tag_id) || new_tag_id.trim().length === 0) {
      return NextResponse.json(
        { error: 'new_tag_id must be lowercase letters, numbers, and hyphens only' },
        { status: 400 },
      );
    }
    const { data: conflict } = await supabase
      .from('tags')
      .select('id')
      .eq('id', new_tag_id)
      .maybeSingle();
    if (conflict) {
      return NextResponse.json({ error: 'A tag with this ID already exists' }, { status: 409 });
    }
    targetId = new_tag_id.trim();
  }

  // Build update payload from only the provided fields
  const update: Record<string, unknown> = {};

  if (targetId) {
    update.id = targetId;
  }

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

  if (image_attribution !== undefined) {
    if (image_attribution !== null && typeof image_attribution !== 'string') {
      return NextResponse.json({ error: 'Invalid image_attribution' }, { status: 400 });
    }
    update.image_attribution = image_attribution || null;
  }

  if (featured !== undefined) {
    if (typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'featured must be a boolean' }, { status: 400 });
    }
    update.featured = featured;
  }

  if (dedication !== undefined) {
    if (dedication !== null && (typeof dedication !== 'string' || dedication.length > 100)) {
      return NextResponse.json({ error: 'dedication too long (max 100 chars)' }, { status: 400 });
    }
    update.dedication = dedication || null;
  }

  if (Object.keys(update).length === 0 && !Array.isArray(body.links)) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const service = createServiceClient();

  if (Object.keys(update).length > 0) {
    const { error } = await service.from('tags').update(update).eq('id', tag_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const effectiveId = targetId ?? tag_id;

  // Replace tag links if provided (use effectiveId after potential rename)
  if (Array.isArray(body.links)) {
    await service.from('site_links').delete().eq('tag_id', effectiveId);
    const linksArr = body.links as { url: string; link_type: string; comment?: string }[];
    if (linksArr.length > 0) {
      const { error: linksError } = await service.from('site_links').insert(
        linksArr.map((l) => ({
          tag_id: effectiveId,
          site_id: null,
          url: l.url,
          link_type: l.link_type,
          comment: l.comment || null,
        }))
      );
      if (linksError) {
        return NextResponse.json({ error: linksError.message }, { status: 500 });
      }
    }
  }

  // If the ID changed, update JSONB references in pending_submissions and rename R2 image
  if (targetId) {
    // pending_submissions stores tag_id inside JSONB payload — not covered by CASCADE
    try {
      await service.rpc('update_pending_submission_tag_id', {
        old_tag_id: tag_id,
        new_tag_id_param: targetId,
      });
    } catch {
      console.warn('[update-tag] Could not update pending_submissions tag_id references via RPC');
    }

    // Rename R2 image if the tag had one
    try {
      const { data: freshTag } = await service
        .from('tags')
        .select('image_url')
        .eq('id', effectiveId)
        .single();

      if (freshTag?.image_url && isR2Url(freshTag.image_url)) {
        const newImageUrl = await renameTagImage(tag_id, effectiveId);
        if (newImageUrl) {
          await service
            .from('tags')
            .update({ image_url: newImageUrl })
            .eq('id', effectiveId);
        }
      }
    } catch (err) {
      console.error('[update-tag] R2 image rename failed (non-fatal):', err);
    }

    revalidatePath(`/tag/${tag_id}`);
    revalidatePath(`/tag/${effectiveId}`);
  }

  return NextResponse.json({ ok: true, new_id: effectiveId });
}
