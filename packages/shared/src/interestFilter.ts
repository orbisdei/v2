import type { MapPin } from './types';

export type InterestLevel = 'global' | 'regional' | 'local' | 'personal';

export const INTEREST_HIERARCHY: InterestLevel[] = ['global', 'regional', 'local', 'personal'];
export const PUBLIC_LEVELS: InterestLevel[] = ['global', 'regional', 'local'];
export const ADMIN_LEVELS: InterestLevel[] = ['global', 'regional', 'local', 'personal'];

/**
 * Normalize a site's interest value. Treat null/undefined/invalid as 'local'.
 */
export function normalizeInterest(interest?: string | null): InterestLevel {
  if (interest && (INTEREST_HIERARCHY as string[]).includes(interest)) {
    return interest as InterestLevel;
  }
  return 'local';
}

/**
 * Filter an array of sites (or any object with an `interest` field) by active levels.
 */
export function filterByInterest<T extends { interest?: string | null }>(
  items: T[],
  activeLevels: Set<InterestLevel>,
): T[] {
  return items.filter((item) => activeLevels.has(normalizeInterest(item.interest)));
}

/**
 * Filter map pins by a set of allowed site IDs (derived from filtered sites).
 */
export function filterPinsBySiteIds(pins: MapPin[], allowedIds: Set<string>): MapPin[] {
  return pins.filter((pin) => allowedIds.has(pin.id));
}

/**
 * For location tag pages: compute the smart default filter levels.
 * - If global count >= highThreshold: show only Global
 * - If global+regional count >= lowThreshold: show Global + Regional
 * - Otherwise: show Global + Regional + Local (no filtering needed)
 */
export function computeLocationDefault(
  sites: { interest?: string | null }[],
  highThreshold: number,
  lowThreshold: number,
): InterestLevel[] {
  const globalCount = sites.filter((s) => normalizeInterest(s.interest) === 'global').length;
  const globalRegionalCount = sites.filter((s) =>
    ['global', 'regional'].includes(normalizeInterest(s.interest)),
  ).length;

  if (globalCount >= highThreshold) return ['global'];
  if (globalRegionalCount >= lowThreshold) return ['global', 'regional'];
  return ['global', 'regional', 'local'];
}

/**
 * Get the available levels for a user based on their role.
 * Non-admins never see 'personal'. Admins see all.
 */
export function getAvailableLevels(userRole?: string | null): InterestLevel[] {
  return userRole === 'administrator' ? ADMIN_LEVELS : PUBLIC_LEVELS;
}

/**
 * Remove personal sites for non-admin users. Always call this before any other filtering.
 */
export function stripPersonalSites<T extends { interest?: string | null }>(
  items: T[],
  userRole?: string | null,
): T[] {
  if (userRole === 'administrator') return items;
  return items.filter((item) => normalizeInterest(item.interest) !== 'personal');
}
