import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
  const siteId = formData.get('site_id') as string | null;

  if (!file || !siteId) {
    return NextResponse.json({ error: 'Missing file or site_id' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. JPEG, PNG, or WebP only.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const storagePath = `sites/${siteId}/${timestamp}-${sanitizedName}`;

  const fileBuffer = await file.arrayBuffer();

  const workerResponse = await fetch(`${process.env.R2_UPLOAD_URL}/${storagePath}`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'Authorization': `Bearer ${process.env.R2_UPLOAD_SECRET}`,
    },
    body: fileBuffer,
  });

  if (!workerResponse.ok) {
    const text = await workerResponse.text();
    return NextResponse.json({ error: `Worker upload failed: ${text}` }, { status: 502 });
  }

  const { url } = await workerResponse.json();
  return NextResponse.json({ url });
}
