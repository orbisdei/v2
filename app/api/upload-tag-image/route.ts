import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeUploadedImage, getImageDimensions, uploadTagImage } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
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

  if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const tagId = formData.get('tag_id') as string | null;

  if (!file || !tagId) {
    return NextResponse.json({ error: 'Missing file or tag_id' }, { status: 400 });
  }

  if (!/^[a-z0-9-]{1,100}$/.test(tagId)) {
    return NextResponse.json({ error: 'Invalid tag_id format' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. JPEG, PNG, or WebP only.' }, { status: 400 });
  }

  // Normalize (EXIF rotation, 2560px cap, strip metadata, re-encode) before
  // storing — the stored master is always a JPEG. The image's dimensions are
  // encoded into the (versioned) key so the render layer can reserve its box.
  let normalized: Buffer;
  let dims: { width: number; height: number };
  try {
    normalized = await normalizeUploadedImage(Buffer.from(await file.arrayBuffer()));
    dims = await getImageDimensions(normalized);
  } catch {
    return NextResponse.json({ error: 'Could not process image — file may be corrupt.' }, { status: 400 });
  }

  let url: string;
  try {
    url = await uploadTagImage(tagId, normalized, dims.width, dims.height);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ url });
}
