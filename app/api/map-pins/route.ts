import { NextResponse } from 'next/server';
import { getMapPins } from '@/lib/data';

/**
 * The full map pin set. Consumed by site detail pages when the fullscreen map
 * opens, so their prerendered payload only has to carry the pins near the
 * site itself (see getNearbyMapPins in lib/data.ts) instead of the whole
 * catalog. getMapPins is unstable_cache'd against the static client, so this
 * is a cheap GET.
 */
export async function GET() {
  const pins = await getMapPins();

  return NextResponse.json(
    { pins },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
