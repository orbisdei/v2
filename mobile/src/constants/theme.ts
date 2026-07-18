// Orbis Dei brand palette — mirrors the web app's Tailwind config.
import { Platform } from 'react-native';

export const Colors = {
  navy: '#1e1e5f',
  gold: '#c9950c',
  visitedGreen: '#639922',
  background: '#ffffff',
  backgroundMuted: '#f7f7f5',
  border: '#e5e5e0',
  text: '#1a1a1a',
  textSecondary: '#6b6b6b',
  featuredBg: '#fef8e0',
  featuredText: '#8a6d0b',
} as const;

// Serif for headings (Georgia on web); RN maps to platform serif.
export const Fonts = {
  serif: Platform.select({ android: 'serif', ios: 'Georgia', default: 'serif' })!,
  sans: Platform.select({ android: 'sans-serif', ios: 'System', default: 'System' })!,
} as const;
