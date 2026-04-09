import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';
import { getCountryName } from '@/lib/countries';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['contributor', 'administrator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { site_name, country, municipality, tags } = await req.json() as {
    site_name: string;
    country?: string;
    municipality?: string;
    tags?: string[];
  };
  if (!site_name?.trim()) {
    return NextResponse.json({ error: 'site_name is required' }, { status: 400 });
  }

  const countryName = country ? getCountryName(country) : undefined;
  const locationHint = municipality && countryName
    ? ` in ${municipality}, ${countryName}`
    : countryName
    ? ` in ${countryName}`
    : '';
  const tagHint = tags?.length ? ` (associated with: ${tags.join(', ')})` : '';

  const prompt = `Write a 2-3 sentence description of "${site_name.trim()}"${locationHint}${tagHint} for use on Orbis Dei, a Catholic and Christian holy sites explorer. Focus on its religious significance, history, and what visitors will find. Be factual and concise. Return only the description text with no extra formatting.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text?.trim() ?? '';
    if (!text) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    return NextResponse.json({ description: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
