// Custom map-pin marker view, mirroring the web MapView pin exactly: navy
// teardrop, white circle, and a per-site-type glyph (Church / House /
// Landmark / Castle) from @orbisdei/shared. Untyped sites get a simple cross.
import { memo } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { SITE_TYPE_GLYPH_PATHS } from '@orbisdei/shared/src/siteTypeGlyphs';
import type { SiteType } from '@orbisdei/shared/src/types';

const TEARDROP = 'M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z';
const CROSS = 'M12 6v12M6 12h12';

interface SitePinProps {
  color: string;
  type?: string | null;
}

function SitePinInner({ color, type }: SitePinProps) {
  const glyph = type && type in SITE_TYPE_GLYPH_PATHS ? SITE_TYPE_GLYPH_PATHS[type as SiteType] : null;
  return (
    <Svg width={28} height={40} viewBox="0 0 28 40">
      <Path d={TEARDROP} fill={color} />
      <Circle cx={14} cy={13} r={6} fill="white" />
      <G
        transform="translate(9, 8) scale(0.4167)"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {(glyph ?? [CROSS]).map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
    </Svg>
  );
}

// Memoized: marker views re-render on every cluster recompute otherwise.
export const SitePin = memo(SitePinInner);
