// Custom map-pin marker view, mirroring the web MapView pin exactly: a solid
// teardrop with the per-site-type glyph (Church / House / Landmark / Castle,
// from @orbisdei/shared) knocked out in white. Untyped sites get a cross.
//
// Geometry matches components/MapView.tsx — the head is a circle centred
// (14,14) r=14, so an 18×18 glyph (24 × 0.75) centred at (14,13) fits with
// every corner inside the head. Keep the two in sync.
import { memo } from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { SITE_TYPE_GLYPH_PATHS, DEFAULT_PIN_GLYPH_PATHS } from '@orbisdei/shared/src/siteTypeGlyphs';
import type { SiteType } from '@orbisdei/shared/src/types';

const TEARDROP = 'M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z';

interface SitePinProps {
  color: string;
  type?: string | null;
}

function SitePinInner({ color, type }: SitePinProps) {
  const paths =
    type && type in SITE_TYPE_GLYPH_PATHS
      ? SITE_TYPE_GLYPH_PATHS[type as SiteType]
      : DEFAULT_PIN_GLYPH_PATHS;
  return (
    <Svg width={28} height={40} viewBox="0 0 28 40">
      <Path d={TEARDROP} fill={color} />
      <G
        transform="translate(5, 4) scale(0.75)"
        fill="none"
        stroke="white"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
    </Svg>
  );
}

// Memoized: marker views re-render on every cluster recompute otherwise.
export const SitePin = memo(SitePinInner);
