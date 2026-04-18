// Shared text-search helpers for sites and tags.
// Centralized so Sidebar, Homepage (desktop + mobile), and /search behave identically.

// Flip to true to also match against site short_description.
const SEARCH_SITE_DESCRIPTION = false;

// Flip to true to also match against tag description on tag searches.
const SEARCH_TAG_DESCRIPTION = false;

export function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

export function buildTagNameLookup(
  tags: ReadonlyArray<{ id: string; name: string }>
): Map<string, string> {
  return new Map(tags.map((t) => [t.id, t.name.toLowerCase()]));
}

export function siteMatchesQuery(
  site: { name: string; short_description?: string; tag_ids: string[] },
  normalizedQuery: string,
  tagNameById: Map<string, string>
): boolean {
  if (!normalizedQuery) return false;
  if (site.name.toLowerCase().includes(normalizedQuery)) return true;
  if (site.tag_ids.some((tid) => tagNameById.get(tid)?.includes(normalizedQuery))) return true;
  if (
    SEARCH_SITE_DESCRIPTION &&
    site.short_description &&
    site.short_description.toLowerCase().includes(normalizedQuery)
  ) {
    return true;
  }
  return false;
}

export function tagMatchesQuery(
  tag: { name: string; description?: string },
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return false;
  if (tag.name.toLowerCase().includes(normalizedQuery)) return true;
  if (
    SEARCH_TAG_DESCRIPTION &&
    tag.description &&
    tag.description.toLowerCase().includes(normalizedQuery)
  ) {
    return true;
  }
  return false;
}
