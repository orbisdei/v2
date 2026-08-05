'use client';

// Topic facet selection + URL sync, shared by every surface that offers facets
// (homepage, tag pages, search, Around Me). Keeps the toggle/clear/?topics=
// plumbing in one place so the page components only deal with layout.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deriveTopicFacets,
  filterSitesByTopics,
  isTopicTag,
  type TopicFacet,
} from '@/lib/topicFacets';

interface FacetableSite { tag_ids: string[] }
interface FacetableTag { id: string; name: string; type?: string | null }

export interface TopicFacetState<T> {
  /** Topics present in scope, most-covered first. */
  facets: TopicFacet[];
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  /** `sites` narrowed to the union of the selected topics. */
  filteredSites: T[];
  isActive: boolean;
}

export function useTopicFacets<T extends FacetableSite>(
  sites: T[],
  tags: FacetableTag[],
): TopicFacetState<T> {
  const router = useRouter();

  const facets = useMemo(() => deriveTopicFacets(sites, tags), [sites, tags]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  // Apply ?topics= once, after mount — exactly like the existing ?levels=
  // handling. Reading it with useSearchParams() would force the whole subtree to
  // client-side rendering and push the LCP image out of the prerendered HTML.
  //
  // Validated against every topic tag rather than only the topics currently in
  // scope: on the homepage the scope narrows as soon as Around Me applies a
  // radius, and a deep link shouldn't be silently dropped for being ahead of it.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('topics');
    if (!param) return;
    const known = new Set(tags.filter(isTopicTag).map((t) => t.id));
    const parsed = param.split(',').map((s) => s.trim()).filter((s) => known.has(s));
    if (parsed.length > 0) setSelected(new Set(parsed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writeUrl = useCallback(
    (next: Set<string>) => {
      const params = new URLSearchParams(window.location.search);
      if (next.size === 0) params.delete('topics');
      else params.set('topics', [...next].join(','));
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router],
  );

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        writeUrl(next);
        return next;
      });
    },
    [writeUrl],
  );

  const clear = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      writeUrl(next);
      return next;
    });
  }, [writeUrl]);

  const filteredSites = useMemo(
    () => filterSitesByTopics(sites, selected),
    [sites, selected],
  );

  return { facets, selected, toggle, clear, filteredSites, isActive: selected.size > 0 };
}
