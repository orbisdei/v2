import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { scrapeAttribution } from '@/lib/attribution';

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const attribution = await scrapeAttribution(url);
    return NextResponse.json({ attribution });
  } catch {
    return NextResponse.json({ attribution: null });
  }
}
