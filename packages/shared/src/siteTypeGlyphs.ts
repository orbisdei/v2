import type { SiteType } from './types';

// Fallback glyph for sites with no `type` set yet (a latin cross), same
// 24×24 space and stroke conventions as the type glyphs below.
export const DEFAULT_PIN_GLYPH_PATHS: string[] = ['M12 3v18', 'M6 9h12'];

// Map-pin glyphs for sites.type, as raw SVG path `d` strings in lucide's
// 24×24 coordinate space (stroke-drawn: fill none, stroke-width 2, round
// caps/joins). Mirrors lucide's Church / House / Landmark / Castle — the same
// mapping as the web SiteTypeLabel component. Lucide's <line>/<polygon>
// primitives (Landmark) are pre-converted to path syntax so consumers only
// ever render <path> elements: the web MapView interpolates these into
// Leaflet DivIcon HTML strings, the mobile SitePin renders them as
// react-native-svg <Path> elements.
export const SITE_TYPE_GLYPH_PATHS: Record<SiteType, string[]> = {
  'active-church': [
    'M10 9h4',
    'M12 7v5',
    'M14 22v-4a2 2 0 0 0-4 0v4',
    'M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22',
    'm18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.618a1 1 0 0 1 .553-.894L6 7',
  ],
  'active-community': [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  'other-religious': [
    'M3 22h18',
    'M6 18v-7',
    'M10 18v-7',
    'M14 18v-7',
    'M18 18v-7',
    'M12 2 20 7H4Z',
  ],
  heritage: [
    'M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2Z',
    'M18 11V4H6v7',
    'M15 22v-4a3 3 0 0 0-3-3a3 3 0 0 0-3 3v4',
    'M22 11V9',
    'M2 11V9',
    'M6 4V2',
    'M18 4V2',
    'M10 4V2',
    'M14 4V2',
  ],
};
