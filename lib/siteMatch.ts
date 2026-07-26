// Duplicate-site detection shared by every import path (research migration,
// AI bulk import, Parallel import). A duplicate must be BOTH nearby AND
// similarly named:
//   - Proximity alone produces false positives in dense historic centres
//     (the Gesù, San Clemente and Sant'Ignazio all sit <1km from unrelated
//     basilicas in Rome), which would permanently skip legitimately new sites.
//   - Name similarity alone produces false positives across countries — the
//     same devotional title recurs at unrelated shrines worldwide.

/** Proximity gate for duplicate detection (applied to lat AND lon). ~1.1km —
 *  deliberately loose, because it is only the FIRST half of the test. */
export const DUP_THRESHOLD_DEG = 0.01;

// Generic words shared by most holy-site names; stripped before comparison so
// similarity is judged on the distinctive tokens ("gesu", "clemente", "lateran").
const NAME_STOPWORDS = new Set([
  'the', 'of', 'and', 'a', 'at', 'in', 'on',
  'de', 'del', 'della', 'delle', 'di', 'dei', 'da', 'do', 'dos', 'das',
  'la', 'le', 'el', 'los', 'las', 'les', 'il', 'lo', 'al', 'alla', 'allo', 'aux', 'du', 'des',
  'saint', 'sainte', 'st', 'ste', 'san', 'santa', 'santo', 'sant', 'sao', 'sta',
  'church', 'basilica', 'cathedral', 'chapel', 'shrine', 'sanctuary', 'santuario',
  'parish', 'monastery', 'abbey', 'convent', 'catholic', 'iglesia', 'eglise',
  'kirche', 'igreja', 'chiesa', 'capela', 'chapelle', 'notre', 'dame', 'our', 'lady',
]);

function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // drop parenthetical translations
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distinctiveTokens(s: string): Set<string> {
  // Drop 1-char tokens too — the possessive in "St. Peter's" normalizes to a
  // stray "s" that would otherwise dilute the ratio.
  return new Set(
    normalizeName(s)
      .split(' ')
      .filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t))
  );
}

/**
 * True when two site names plausibly refer to the same place. Pair with the
 * proximity gate (see findNearbySites / findDuplicate).
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ta = distinctiveTokens(a);
  const tb = distinctiveTokens(b);
  // All-generic names (e.g. "The Cathedral") fall back to full normalized equality.
  if (ta.size === 0 || tb.size === 0) return false;

  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;

  // Divide by the LARGER token set so unmatched distinctive words count against
  // the score: "Catacombs of San Valentino" vs "Basilica of San Valentino" share
  // only "valentino" and must not be treated as the same place.
  if (shared / Math.max(ta.size, tb.size) >= 0.6) return true;

  // Superset case — "Basilica of Bom Jesus" vs "Basilica of Bom Jesus, Old Goa".
  // Requires >=2 shared distinctive tokens so a single shared saint name is never
  // enough on its own.
  return shared >= 2 && shared / Math.min(ta.size, tb.size) >= 0.8;
}

export interface MatchableSite {
  id: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Sites within the proximity gate of (lat, lon). */
export function findNearbySites<T extends MatchableSite>(lat: number, lon: number, sites: T[]): T[] {
  return sites.filter(
    (e) =>
      e.latitude != null &&
      e.longitude != null &&
      Math.abs(e.latitude - lat) < DUP_THRESHOLD_DEG &&
      Math.abs(e.longitude - lon) < DUP_THRESHOLD_DEG
  );
}

/** The full two-part test: nearby AND similarly named, or undefined. */
export function findDuplicate<T extends MatchableSite>(
  name: string,
  lat: number,
  lon: number,
  sites: T[]
): T | undefined {
  return findNearbySites(lat, lon, sites).find((e) => namesMatch(name, e.name ?? ''));
}
