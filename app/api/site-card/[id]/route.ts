import { NextResponse } from 'next/server';
import { getSiteBySlug, getTagsForSite } from '@/lib/data';

/**
 * Card data for one site: the Site row + its tags. Consumed by
 * lib/hooks/useSiteCard.ts to hydrate map popup cards on demand, so pages
 * with maps don't have to ship the full site catalog in their payload.
 * Both reads are unstable_cache'd (static client), so this is a cheap GET.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid site id' }, { status: 400 });
  }

  const [site, tags] = await Promise.all([getSiteBySlug(id), getTagsForSite(id)]);
  if (!site) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(
    { site, tags },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
