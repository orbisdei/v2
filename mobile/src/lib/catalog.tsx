// Loads the site catalog + tag list once and shares them app-wide,
// mirroring the web app's pattern of fetching the summary catalog on the
// homepage and deriving map pins / search results / tag chips from it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAllSitesSummary, getAllTags } from './data';
import { stripPersonalSites } from './interestFilter';
import { useAuth } from './auth';
import type { Site, Tag } from './types';

interface CatalogContextValue {
  sites: Site[];
  tags: Tag[];
  tagsById: Map<string, Tag>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue>({
  sites: [],
  tags: [],
  tagsById: new Map(),
  loading: true,
  error: null,
  refresh: async () => {},
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [siteRows, tagRows] = await Promise.all([getAllSitesSummary(), getAllTags()]);
      setAllSites(siteRows);
      setTags(tagRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Personal-interest sites are admin-only, same rule as the web app.
  const sites = useMemo(() => stripPersonalSites(allSites, profile?.role), [allSites, profile?.role]);
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  return (
    <CatalogContext.Provider value={{ sites, tags, tagsById, loading, error, refresh }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
