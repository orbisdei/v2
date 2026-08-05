// Topic faceting: given any set of sites and the tags they reference, work out
// which topics are present and how many sites each covers. Pure TypeScript —
// shared by web + mobile, no framework imports.
//
// This is deliberately scope-agnostic. The "scope" is whatever site array you
// pass in: every site in France, every site within 5 km of the user, every
// search result. That is the whole point of the feature — the intersection of a
// place and a topic, which no single tag page can express.

/** Minimal shape a site needs to be facetable. */
interface FacetableSite {
  tag_ids: string[];
}

/** Minimal shape a tag needs to be a facet. */
interface FacetableTag {
  id: string;
  name: string;
  type?: string | null;
}

export interface TopicFacet {
  id: string;
  name: string;
  count: number;
}

/**
 * Topic tags are those explicitly typed 'topic', plus untyped ones — the same
 * test SiteCard and Sidebar already use (`t.type === 'topic' || !t.type`).
 * Location tags (country/region/municipality) are never facets: narrowing by
 * geography is what the child-tag pills already do.
 */
export function isTopicTag(tag: FacetableTag): boolean {
  return tag.type === 'topic' || !tag.type;
}

/**
 * Count sites per topic within `sites`, sorted most-covered first. Topics with
 * no sites in scope are omitted entirely — a facet that filters to nothing is
 * never worth offering.
 */
export function deriveTopicFacets(sites: FacetableSite[], tags: FacetableTag[]): TopicFacet[] {
  const topicById = new Map<string, FacetableTag>();
  for (const tag of tags) {
    if (isTopicTag(tag)) topicById.set(tag.id, tag);
  }

  const counts = new Map<string, number>();
  for (const site of sites) {
    // A site can carry the same tag only once, so no per-site dedupe is needed.
    for (const tagId of site.tag_ids) {
      if (topicById.has(tagId)) counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: topicById.get(id)!.name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * A facet needs at least this many sites to earn an inline pill. Across the
 * catalog most topics have exactly one site (France: 19 of 35), and a facet that
 * narrows 62 sites to 1 is a link wearing a filter's clothes. Singles are still
 * reachable — the overflow sheet shows them behind a labelled disclosure.
 */
export const MIN_INLINE_FACET_COUNT = 2;

/** How many pills to show before collapsing into the overflow trigger. */
export const DEFAULT_INLINE_FACET_LIMIT = 5;

export function splitFacets(
  facets: TopicFacet[],
  limit = DEFAULT_INLINE_FACET_LIMIT,
  selected?: ReadonlySet<string>,
): { inline: TopicFacet[]; hasOverflow: boolean } {
  const sel = selected ?? new Set<string>();
  const chosen = new Set<string>();

  // Selected facets stay visible wherever they rank and whatever their count —
  // otherwise picking a facet from the overflow sheet makes its own pill vanish.
  for (const f of facets) if (sel.has(f.id)) chosen.add(f.id);

  // Then fill the remaining budget with the best-covered eligible facets.
  const budget = Math.max(limit, sel.size);
  for (const f of facets) {
    if (chosen.size >= budget) break;
    if (!chosen.has(f.id) && f.count >= MIN_INLINE_FACET_COUNT) chosen.add(f.id);
  }

  const inline = facets.filter((f) => chosen.has(f.id));
  return { inline, hasOverflow: facets.length > inline.length };
}

/**
 * Union (OR), not intersection. Decided from the data: St. Joan of Arc and
 * St. Therese of Lisieux are the two largest topics in France and they intersect
 * to zero sites. At this catalog size intersection is an empty-state generator.
 */
export function filterSitesByTopics<T extends FacetableSite>(
  sites: T[],
  selected: ReadonlySet<string>,
): T[] {
  if (selected.size === 0) return sites;
  return sites.filter((site) => site.tag_ids.some((id) => selected.has(id)));
}

/** Parse a `?topics=a,b` param, keeping only ids that exist in scope. */
export function parseTopicsParam(param: string | null, known: TopicFacet[]): Set<string> {
  if (!param) return new Set();
  const valid = new Set(known.map((f) => f.id));
  return new Set(param.split(',').map((s) => s.trim()).filter((s) => valid.has(s)));
}

/** Serialize selected topics for the URL, in the facets' own display order. */
export function serializeTopicsParam(selected: ReadonlySet<string>, known: TopicFacet[]): string {
  return known.filter((f) => selected.has(f.id)).map((f) => f.id).join(',');
}
