import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/utils/supabase/server';

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

  const { tag_name, tag_type } = await req.json() as { tag_name: string; tag_type?: string };
  if (!tag_name?.trim()) {
    return NextResponse.json({ error: 'tag_name is required' }, { status: 400 });
  }

  const typeHint = tag_type && tag_type !== 'topic'
    ? ` (a ${tag_type}-level location tag)`
    : ' (a topic tag on a Catholic holy sites explorer)';

  const prompt = `Write a 1-3 sentence overview of "${tag_name}"${typeHint} for use on Orbis Dei, a Catholic and Christian holy sites explorer. Focus on its religious or geographic significance. Be factual and concise. Return only the description text with no extra formatting.`;

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
