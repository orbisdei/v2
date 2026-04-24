// Shared text-search helpers for sites and tags.
// Centralized so Sidebar, Homepage (desktop + mobile), and /search behave identically.

export function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

export function buildTagNameLookup(
  tags: ReadonlyArray<{ id: string; name: string }>
): Map<string, string> {
  return new Map(tags.map((t) => [t.id, t.name.toLowerCase()]));
}

export function siteMatchesQuery(
  site: { name: string; tag_ids: string[] },
  normalizedQuery: string,
  tagNameById: Map<string, string>
): boolean {
  if (!normalizedQuery) return false;
  if (site.name.toLowerCase().includes(normalizedQuery)) return true;
  if (site.tag_ids.some((tid) => tagNameById.get(tid)?.includes(normalizedQuery))) return true;
  return false;
}

export function tagMatchesQuery(
  tag: { name: string },
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return false;
  return tag.name.toLowerCase().includes(normalizedQuery);
}
