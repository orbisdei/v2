import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { slugify } from '@/lib/utils';


async function reverseGeocode(lat: number, lon: number): Promise<{ country?: string; municipality?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'OrbisDeI/1.0 (orbisdei.org)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address ?? {};
    const countryCode = (addr.country_code as string)?.toUpperCase();
    const municipality = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '';
    return { country: countryCode, municipality };
  } catch {
    return {};
  }
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
  const { mode, topic, urls, region, autoTagIds = [], promptOverride, input } = body as {
    mode: 'topic' | 'url' | 'gmaps';
    topic?: string;
    urls?: string[];
    region?: string;
    autoTagIds?: string[];
    promptOverride?: string;
    input?: string; // for gmaps mode
  };

  // Input validation
  if (mode !== 'topic' && mode !== 'url' && mode !== 'gmaps') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  // ── Google Maps URL mode ───────────────────────────────────
  if (mode === 'gmaps') {
    if (!input || typeof input !== 'string' || !input.trim()) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }
    const isGMaps = /google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl/.test(input);
    if (!isGMaps) {
      return NextResponse.json({ error: 'Please enter a valid Google Maps link.' }, { status: 400 });
    }

    // Resolve shortened URLs
    let resolvedUrl = input.trim();
    if (/goo\.gl\/maps|maps\.app\.goo\.gl/.test(resolvedUrl)) {
      try {
        const headRes = await fetch(resolvedUrl, { redirect: 'follow', method: 'HEAD' });
        if (headRes.url) resolvedUrl = headRes.url;
      } catch { /* fall back to original */ }
    }

    // Extract coordinates from URL
    function extractCoords(url: string): { lat?: number; lon?: number } {
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
      const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dMatch) return { lat: parseFloat(dMatch[1]), lon: parseFloat(dMatch[2]) };
      const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) return { lat: parseFloat(qMatch[1]), lon: parseFloat(qMatch[2]) };
      return {};
    }
    function extractPlaceName(url: string): string | undefined {
      const placeMatch = url.match(/\/place\/([^/@?]+)/);
      if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      return undefined;
    }

    const { lat: extractedLat, lon: extractedLon } = extractCoords(resolvedUrl);
    const extractedName = extractPlaceName(resolvedUrl);

    let userMsg = `Google Maps URL: ${resolvedUrl}`;
    if (extractedLat !== undefined && extractedLon !== undefined) {
      userMsg += `\nCoordinates extracted from URL: ${extractedLat}, ${extractedLon}`;
    }
    if (extractedName) userMsg += `\nPlace name from URL: ${extractedName}`;

    const gmapsSystemPrompt =
      'You are a Catholic holy sites research assistant for Orbis Dei. Given a Google Maps URL for a location, generate detailed information about this place. Return a JSON object with: name (the official name of the place), local_name (the name in the local language, if different from English — otherwise null), short_description (2-3 sentences describing the site\'s religious significance, history, and what visitors will find), latitude (decimal number), longitude (decimal number), google_maps_url (the original URL provided), suggested_tags (array of relevant tags like country, city, saint names, site type such as "Active Churches", "Basilicas", "Marian Sites", etc.), and suggested_links (array of objects with url and link_type — try to include an official website and Wikipedia link if you know them). Return ONLY valid JSON with no other text.';

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let gmapsResponse;
    try {
      gmapsResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMsg,
        config: { systemInstruction: gmapsSystemPrompt, responseMimeType: 'application/json' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown AI error';
      return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 });
    }

    const gmapsText = gmapsResponse.text ?? '';
    let proposed: Record<string, unknown>;
    try {
      const raw = JSON.parse(gmapsText);
      proposed = Array.isArray(raw) ? raw[0] : raw;
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: gmapsText.slice(0, 500) }, { status: 500 });
    }

    const { data: existingSites } = await supabase.from('sites').select('id, name, latitude, longitude');
    const existing = existingSites ?? [];

    const name = typeof proposed.name === 'string' ? proposed.name : (extractedName ?? '');
    const lat = typeof proposed.latitude === 'number' ? proposed.latitude : (extractedLat ?? 0);
    const lon = typeof proposed.longitude === 'number' ? proposed.longitude : (extractedLon ?? 0);

    const duplicate = existing.find(
      (e) => Math.abs(e.latitude - lat) < 0.01 && Math.abs(e.longitude - lon) < 0.01
    );

    const usedSlugs = new Set(existing.map((e) => e.id));
    let id = slugify(name);
    let counter = 2;
    while (usedSlugs.has(id)) { id = `${slugify(name)}-${counter++}`; }

    // Match suggested_tags against existing tags by name
    const suggestedTagNames = Array.isArray(proposed.suggested_tags) ? proposed.suggested_tags as string[] : [];
    let matchedTagIds: string[] = [];
    if (suggestedTagNames.length > 0) {
      const { data: tagRows } = await supabase.from('tags').select('id, name').in('name', suggestedTagNames);
      matchedTagIds = (tagRows ?? []).map((t) => t.id);
    }
    const finalTagIds = [...new Set([...autoTagIds, ...matchedTagIds])];

    const geo = await reverseGeocode(lat, lon);

    return NextResponse.json({
      sites: [{
        id,
        name,
        native_name: typeof proposed.local_name === 'string' && proposed.local_name ? proposed.local_name : undefined,
        country: geo.country ?? '',
        municipality: geo.municipality ?? '',
        short_description: typeof proposed.short_description === 'string' ? proposed.short_description : '',
        latitude: lat,
        longitude: lon,
        google_maps_url: input.trim(),
        interest: '',
        links: Array.isArray(proposed.suggested_links) ? proposed.suggested_links : [],
        tag_ids: finalTagIds,
        status: duplicate ? 'duplicate' : 'new',
        duplicate_id: duplicate?.id ?? null,
      }],
    });
  }
  if (mode === 'topic') {
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0 || topic.length > 500) {
      return NextResponse.json({ error: 'topic is required (max 500 chars)' }, { status: 400 });
    }
  }
  if (mode === 'url') {
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > 50) {
      return NextResponse.json({ error: 'urls must be a non-empty array (max 50)' }, { status: 400 });
    }
    for (const u of urls) {
      try { new URL(u); } catch {
        return NextResponse.json({ error: `Invalid URL: ${u}` }, { status: 400 });
      }
    }
  }
  if (region && (typeof region !== 'string' || region.length > 200)) {
    return NextResponse.json({ error: 'region too long (max 200 chars)' }, { status: 400 });
  }
  if (!Array.isArray(autoTagIds) || autoTagIds.length > 20) {
    return NextResponse.json({ error: 'autoTagIds must be an array (max 20)' }, { status: 400 });
  }
  if (promptOverride && (typeof promptOverride !== 'string' || promptOverride.length > 10000)) {
    return NextResponse.json({ error: 'promptOverride too long (max 10000 chars)' }, { status: 400 });
  }

  // Fetch existing sites for duplicate detection
  const { data: existingSites } = await supabase
    .from('sites')
    .select('id, name, latitude, longitude');
  const existing = existingSites ?? [];

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemPrompt =
    'You are a Catholic holy sites expert with deep knowledge of churches, shrines, basilicas, and pilgrimage sites worldwide. Return ONLY a valid JSON array. No markdown, no code fences, no explanation — just the raw JSON array.';

  let userPrompt: string;

  if (mode === 'topic') {
    userPrompt = `List real, verifiable Catholic holy sites related to: "${topic}"${region ? ` in or near ${region}` : ''}.

    Restrict yourself to sites which have direct connections to the topic. For example, if the topic is a saint, do not include shrines in honor of the saint. Only include places where the saint lived or is now buried.

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
    
    Check the google maps link for accuracy.

    interest must be one of: "global", "regional", "local", "personal".
    Only include sites you are highly confident about. Provide accurate GPS coordinates.`;
  } else {
    const urlList = (urls ?? []).join('\n');
    userPrompt = `For each of these URLs, provide information about the Catholic holy site or sites it refers to:
    
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

    Check the google maps link for accuracy.

    interest must be one of: "global", "regional", "local", "personal".
    Use your knowledge of these sites. Provide accurate GPS coordinates.`;
  }

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptOverride?.trim() || userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 });
  }

  const text = response.text ?? '';
  let proposed: Record<string, unknown>[];
  try {
    proposed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response', raw: text.slice(0, 500) },
      { status: 500 }
    );
  }

  // Deduplicate slugs within batch
  const usedSlugs = new Set(existing.map((e) => e.id));

  const results = [];
  for (const site of proposed.filter((s) => s.name && s.latitude && s.longitude)) {
    const name = site.name as string;
    const lat = Number(site.latitude);
    const lon = Number(site.longitude);

    const duplicate = existing.find(
      (e) => Math.abs(e.latitude - lat) < 0.008 && Math.abs(e.longitude - lon) < 0.008
    );

    let id = slugify(name);
    let counter = 2;
    while (usedSlugs.has(id)) {
      id = `${slugify(name)}-${counter++}`;
    }
    usedSlugs.add(id);

    const geo = await reverseGeocode(lat, lon);
    await new Promise((r) => setTimeout(r, 1100));

    results.push({
      id,
      name,
      country: geo.country ?? '',
      municipality: geo.municipality ?? '',
      short_description: (site.short_description as string) ?? '',
      latitude: lat,
      longitude: lon,
      google_maps_url: (site.google_maps_url as string) ?? '',
      interest: (site.interest as string) ?? 'regional',
      links: (site.links as Array<{ url: string; link_type: string }>) ?? [],
      tag_ids: autoTagIds,
      status: duplicate ? 'duplicate' : 'new',
      duplicate_id: duplicate?.id ?? null,
    });
  }

  return NextResponse.json({ sites: results });
}
