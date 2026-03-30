import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadTagImage(
  supabase: SupabaseClient,
  tagId: string,
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const ext = fileName.split('.').pop() ?? 'jpg';
  const storagePath = `tags/${tagId}/hero.${ext}`;
  const { error } = await supabase.storage.from('site-images').upload(storagePath, file, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('site-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadSiteImage(
  supabase: SupabaseClient,
  siteId: string,
  file: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const storagePath = `sites/${siteId}/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage.from('site-images').upload(storagePath, file, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('site-images').getPublicUrl(storagePath);
  return data.publicUrl;
}
