import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/utils/supabase/server';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function extractJSON(text: string): unknown[] {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) { try { return JSON.parse(match[1].trim()); } catch {} }
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }
  throw new Error('Could not parse AI response as JSON');
}

export async function POST(req: Request) {
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

  const body = await req.json();
  const { mode, topic, urls, region, autoTagIds = [] } = body as {
    mode: 'topic' | 'url';
    topic?: string;
    urls?: string[];
    region?: string;
    autoTagIds?: string[];
  };

  // Fetch existing sites for duplicate detection
  const { data: existingSites } = await supabase
    .from('sites')
    .select('id, name, latitude, longitude');
  const existing = existingSites ?? [];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt =
    'You are a Catholic holy sites expert with deep knowledge of churches, shrines, basilicas, and pilgrimage sites worldwide. Return ONLY a valid JSON array. No markdown, no code fences, no explanation — just the raw JSON array.';

  let userPrompt: string;

  if (mode === 'topic') {
    userPrompt = `List 10–15 real, verifiable Catholic holy sites related to: "${topic}"${region ? ` in or near ${region}` : ''}.

Return a JSON array where each element has exactly these fields:
[
  {
    "name": "Full official name of the site",
    "short_description": "1–2 sentences describing its Catholic significance",
    "latitude": 12.3456,
    "longitude": 78.9012,
    "google_maps_url": "https://maps.app.goo.gl/...",
    "interest": "global",
    "links": [
      {"url": "https://...", "link_type": "Official Website"},
      {"url": "https://en.wikipedia.org/wiki/...", "link_type": "Wikipedia"}
    ]
  }
]

interest must be one of: "global", "regional", or "local".
Only include sites you are highly confident about. Provide accurate GPS coordinates.`;
  } else {
    const urlList = (urls ?? []).join('\n');
    userPrompt = `For each of these URLs, provide information about the Catholic holy site it refers to:

${urlList}

Return a JSON array where each element has exactly these fields:
[
  {
    "name": "Full official name of the site",
    "short_description": "1–2 sentences describing its Catholic significance",
    "latitude": 12.3456,
    "longitude": 78.9012,
    "google_maps_url": "https://maps.app.goo.gl/...",
    "interest": "global",
    "source_url": "the original URL from the list above",
    "links": [
      {"url": "https://...", "link_type": "Official Website"},
      {"url": "https://en.wikipedia.org/wiki/...", "link_type": "Wikipedia"}
    ]
  }
]

interest must be one of: "global", "regional", or "local".
Use your knowledge of these sites. Provide accurate GPS coordinates.`;
  }

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  let proposed: Record<string, unknown>[];
  try {
    proposed = extractJSON(text) as Record<string, unknown>[];
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response', raw: text.slice(0, 500) },
      { status: 500 }
    );
  }

  // Deduplicate slugs within batch
  const usedSlugs = new Set(existing.map((e) => e.id));

  const results = proposed
    .filter((site) => site.name && site.latitude && site.longitude)
    .map((site) => {
      const name = site.name as string;
      const lat = Number(site.latitude);
      const lon = Number(site.longitude);

      const duplicate = existing.find(
        (e) =>
          e.name.toLowerCase() === name.toLowerCase() ||
          (Math.abs(e.latitude - lat) < 0.008 && Math.abs(e.longitude - lon) < 0.008)
      );

      let id = slugify(name);
      let counter = 2;
      while (usedSlugs.has(id)) {
        id = `${slugify(name)}-${counter++}`;
      }
      usedSlugs.add(id);

      return {
        id,
        name,
        short_description: (site.short_description as string) ?? '',
        latitude: lat,
        longitude: lon,
        google_maps_url: (site.google_maps_url as string) ?? '',
        interest: (site.interest as string) ?? 'regional',
        links: (site.links as Array<{ url: string; link_type: string }>) ?? [],
        tag_ids: autoTagIds,
        status: duplicate ? 'duplicate' : 'new',
        duplicate_id: duplicate?.id ?? null,
      };
    });

  return NextResponse.json({ sites: results });
}
