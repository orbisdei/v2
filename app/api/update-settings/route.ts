import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import type { InterestLevel } from '@/lib/interestFilter';
import { INTEREST_HIERARCHY } from '@/lib/interestFilter';

const KNOWN_KEYS = [
  'homepage_default_levels',
  'location_tag_high_threshold',
  'location_tag_low_threshold',
] as const;

type KnownKey = (typeof KNOWN_KEYS)[number];

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { key: string; value: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { key, value } = body;

  // Validate key
  if (!KNOWN_KEYS.includes(key as KnownKey)) {
    return NextResponse.json({ error: `Unknown setting key: ${key}` }, { status: 400 });
  }

  // Validate value
  if (key === 'homepage_default_levels') {
    if (!Array.isArray(value) || value.length === 0) {
      return NextResponse.json({ error: 'homepage_default_levels must be a non-empty array' }, { status: 400 });
    }
    for (const level of value) {
      if (!(INTEREST_HIERARCHY as string[]).includes(level)) {
        return NextResponse.json({ error: `Invalid interest level: ${level}` }, { status: 400 });
      }
    }
  } else {
    // threshold keys
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      return NextResponse.json({ error: `${key} must be a positive integer` }, { status: 400 });
    }
  }

  // Write via service client
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from('site_config')
    .upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'key' }
    );

  if (error) {
    console.error('update-settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
