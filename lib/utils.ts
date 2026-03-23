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
