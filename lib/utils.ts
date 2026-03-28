/**
 * Converts a display name into a URL-safe slug.
 */
export function slugify(name: string, maxLength = 80): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, maxLength);
}

/**
 * Returns true if the value is a valid http/https URL, or empty/null (optional fields).
 */
export function isValidHttpUrl(s: unknown): boolean {
  if (!s || s === '') return true;
  try {
    const u = new URL(s as string);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Slugifies a string for use inside a site ID:
 * strips combining diacritics, lowercases, replaces non-alphanumeric runs with a dash,
 * and trims leading/trailing dashes.
 */
function slugifyIdPart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a canonical site ID in the format:
 * <country-code>-<municipality-slug>-<name-slug>
 * e.g. "it-rome-sistine-chapel"
 */
export function generateSiteId(country: string, municipality: string, name: string): string {
  const cc = country.trim().toLowerCase();
  const muni = slugifyIdPart(municipality.trim());
  const namePart = slugifyIdPart(name.trim());
  return [cc, muni, namePart].filter(Boolean).join('-');
}
