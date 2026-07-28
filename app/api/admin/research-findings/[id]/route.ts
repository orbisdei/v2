import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

const VALID_STATUS = new Set(['candidate', 'excluded', 'duplicate', 'proposed_modification']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_INTEREST = new Set(['', 'global', 'regional', 'local', 'topical']);
const VALID_SITE_TYPE = new Set(['active-church', 'active-community', 'other-religious', 'heritage']);

// Whitelisted columns this route may touch. Kept narrow and deliberate —
// research_findings also carries pipeline-owned fields (reviewed, approved,
// site_id, tags, etc.) that this admin page never writes directly; those stay
// under the migration script's exclusive control.
type Patch = {
  status?: string;
  confidence?: string;
  import_status?: string | null;
  name?: string;
  native_name?: string | null;
  description?: string | null;
  country?: string | null;
  municipality?: string | null;
  street_address?: string | null;
  interest?: string | null;
  site_type?: string | null;
  google_maps_url_override?: string | null;
};

function validate(body: Record<string, unknown>): { update: Record<string, unknown> } | { error: string } {
  const update: Record<string, unknown> = {};
  const p = body as Patch;

  if (p.status !== undefined) {
    if (typeof p.status !== 'string' || !VALID_STATUS.has(p.status)) return { error: 'Invalid status' };
    update.status = p.status;
  }
  if (p.confidence !== undefined) {
    if (typeof p.confidence !== 'string' || !VALID_CONFIDENCE.has(p.confidence)) {
      return { error: 'Invalid confidence' };
    }
    update.confidence = p.confidence;
  }
  if (p.import_status !== undefined) {
    if (p.import_status !== null && typeof p.import_status !== 'string') return { error: 'Invalid import_status' };
    update.import_status = p.import_status;
  }
  if (p.name !== undefined) {
    if (typeof p.name !== 'string' || p.name.trim().length === 0 || p.name.length > 300) {
      return { error: 'Invalid name' };
    }
    update.name = p.name.trim();
  }
  for (const key of ['native_name', 'description', 'municipality', 'street_address'] as const) {
    const v = p[key];
    if (v !== undefined) {
      if (v !== null && typeof v !== 'string') return { error: `Invalid ${key}` };
      update[key] = v === '' ? null : v;
    }
  }
  if (p.country !== undefined) {
    if (p.country !== null && (typeof p.country !== 'string' || p.country.length > 2)) {
      return { error: 'Invalid country' };
    }
    update.country = p.country ? p.country.toUpperCase() : null;
  }
  if (p.interest !== undefined) {
    if (typeof p.interest !== 'string' || !VALID_INTEREST.has(p.interest)) return { error: 'Invalid interest' };
    update.interest = p.interest || null;
  }
  if (p.site_type !== undefined) {
    if (p.site_type !== null && !VALID_SITE_TYPE.has(p.site_type)) return { error: 'Invalid site_type' };
    update.site_type = p.site_type;
  }
  for (const key of ['google_maps_url_override'] as const) {
    const v = p[key];
    if (v !== undefined) {
      if (v !== null && typeof v !== 'string') return { error: `Invalid ${key}` };
      update[key] = v === '' ? null : v;
    }
  }

  return { update };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = validate(body);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  if (Object.keys(result.update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from('research_findings').update(result.update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
