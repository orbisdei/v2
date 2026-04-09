import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const id = req.nextUrl.searchParams.get('id');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  if (!id || typeof id !== 'string') {
    return new NextResponse('Missing id', { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('sites')
    .update({ has_no_image: true })
    .eq('id', id);

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem">
      <h2>&#10003; Marked as no image</h2>
      <p>Site <strong>${id}</strong> has been marked as confirmed no image.</p>
      <p><a href="https://orbisdei.org/admin">Back to admin</a></p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}
