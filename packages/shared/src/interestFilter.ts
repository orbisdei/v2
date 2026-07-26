import type { MapPin } from './types';

export type InterestLevel = 'global' | 'regional' | 'local' | 'topical' | 'personal';

// The browsable hierarchy, in descending reach: global > regional > local > topical.
// 'personal' is deliberately NOT part of it — personal sites never appear in
// filters, search, or maps for anyone; they surface only inside a user's own lists.
export const INTEREST_HIERARCHY: InterestLevel[] = ['global', 'regional', 'local', 'topical'];
export const PUBLIC_LEVELS: InterestLevel[] = INTEREST_HIERARCHY;

// Every value a site's `interest` column can legitimately hold.
const ALL_LEVELS: InterestLevel[] = [...INTEREST_HIERARCHY, 'personal'];

/**
 * Normalize a site's interest value. Treat null/undefined/invalid as 'local'.
 */
export function normalizeInterest(interest?: string | null): InterestLevel {
  if (interest && (ALL_LEVELS as string[]).includes(interest)) {
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
 * - Otherwise: show the full hierarchy (no filtering needed)
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
  return [...INTEREST_HIERARCHY];
}

/**
 * Remove personal sites from any browsable surface (homepage, search, tag pages,
 * maps). Applies to everyone, admins included — personal sites are reachable
 * only through a user's own lists. Always call this before any other filtering.
 */
export function stripPersonalSites<T extends { interest?: string | null }>(items: T[]): T[] {
  return items.filter((item) => normalizeInterest(item.interest) !== 'personal');
}
