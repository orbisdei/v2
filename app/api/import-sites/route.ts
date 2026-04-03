import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { slugify } from '@/lib/utils';

// ─── 1. EXTERNAL API HELPERS ───────────────────────────────────────────────

async function reverseGeocode(lat: number, lon: number): Promise<{ country?: string; municipality?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'OrbisDeI/1.0 (orbisdei.org)' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address ?? {};
    return { 
      country: (addr.country_code as string)?.toUpperCase(), 
      municipality: addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || '' 
    };
  } catch {
    return {};
  }
}

// The $0.00 method for getting exact Google Place IDs
async function getGooglePlaceId(query: string): Promise<string | null> {
  if (!process.env.GOOGLE_PLACES_API_KEY) return null;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id' // This mask makes the query free
      },
      body: JSON.stringify({ textQuery: query })
    });
    const data = await res.json();
    return data.places?.[0]?.id || null;
  } catch {
    return null;
  }
}

// ─── 2. MAIN ROUTE HANDLER ──────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'administrator') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  if (!['topic', 'url', 'gmaps'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // ── GMAPS MODE (Unchanged, URL Extraction) ──
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
   

  // ── TOPIC & URL MODES ──
  const { data: existingSites } = await supabase.from('sites').select('id, name, latitude, longitude');
  const existing = existingSites ?? [];
  const usedSlugs = new Set(existing.map((e) => e.id));

  // Dynamic Few-Shot: Fetch Approved Golden Examples
  const { data: goldenRecords } = await supabase
    .from('sites')
    .select('name, country, municipality, short_description, interest')
    .eq('is_golden', true)
    .limit(3);

  let goldenPrompt = '';
  if (goldenRecords && goldenRecords.length > 0) {
    goldenPrompt = `\n\nHere are examples of the exact tone and detail expected:\n${JSON.stringify(goldenRecords, null, 2)}`;
  }

  const systemPrompt = `You are a Catholic holy sites expert. Research locations and return precise data. Do not guess coordinates; focus only on factual descriptions and geographic locations (City/Country).${goldenPrompt}`;

  let userPrompt = '';
  if (mode === 'topic') {
    userPrompt = `List real, verifiable Catholic holy sites related to: "${topic}"${region ? ` in or near ${region}` : ''}. Restrict yourself to sites which have direct connections to the topic. For example, if the topic is a saint, do not include shrines in honor of the saint. Only include places where the saint lived or is now buried. Return up to 5 highly confident results.`;
  } else {
    userPrompt = `For each of these URLs, extract the primary Catholic holy site it refers to:\n${(urls ?? []).join('\n')}`;
  }

  // Strict JSON Schema Output
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Full official name of the site" },
        country: { type: Type.STRING, description: "Country where the site is located" },
        municipality: { type: Type.STRING, description: "City, town, or village" },
        short_description: { type: Type.STRING, description: "1-2 sentences describing its Catholic significance" },
        interest: { type: Type.STRING, description: "Must be: global, regional, local, or personal" },
        official_website: { type: Type.STRING, description: "URL to official site if known", nullable: true },
        wikipedia_url: { type: Type.STRING, description: "URL to Wikipedia article if known", nullable: true }
      },
      required: ["name", "country", "municipality", "short_description", "interest"]
    }
  };

  let proposed: any[] = [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptOverride?.trim() || userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });
    proposed = JSON.parse(response.text ?? '[]');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 502 });
  }

  // ── PARALLEL PLACE ID LOOKUPS (free, no rate limit concern) ──
  const placeIdResults = await Promise.all(
    proposed.map((site: any) => {
      const q = `${site.name}, ${site.municipality}, ${site.country}`;
      return getGooglePlaceId(q);
    })
  );

  const results = proposed.map((site: any, i: number) => {
    const searchQuery = `${site.name}, ${site.municipality}, ${site.country}`;
    const placeId = placeIdResults[i];
    const mapsUrl = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}&query_place_id=${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;

    let id = slugify(site.name);
    let counter = 2;
    while (usedSlugs.has(id)) { id = `${slugify(site.name)}-${counter++}`; }
    usedSlugs.add(id);

    return {
      id,
      name: site.name,
      country: site.country ?? '',
      municipality: site.municipality ?? '',
      short_description: site.short_description,
      latitude: 0,
      longitude: 0,
      google_maps_url: mapsUrl,
      interest: site.interest,
      links: [
        site.official_website && { url: site.official_website, link_type: "Official Website" },
        site.wikipedia_url && { url: site.wikipedia_url, link_type: "Wikipedia" }
      ].filter(Boolean),
      tag_ids: autoTagIds,
      status: 'new' as const,
      duplicate_id: null,
    };
  });

  return NextResponse.json({ sites: results });
}