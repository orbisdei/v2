import type { MetadataRoute } from 'next';
import { createStaticClient } from '@/utils/supabase/static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const supabase = createStaticClient();

  const [{ data: sites }, { data: tags }] = await Promise.all([
    supabase.from('sites').select('id, updated_at'),
    supabase.from('tags').select('id'),
  ]);

  const siteEntries: MetadataRoute.Sitemap = (sites ?? []).map((s) => ({
    url: `${base}/site/${s.id}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const tagEntries: MetadataRoute.Sitemap = (tags ?? []).map((t) => ({
    url: `${base}/tag/${t.id}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    { url: base, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    ...siteEntries,
    ...tagEntries,
  ];
}
