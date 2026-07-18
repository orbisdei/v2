// Loads the site catalog + tag list once and shares them app-wide,
// mirroring the web app's pattern of fetching the summary catalog on the
// homepage and deriving map pins / search results / tag chips from it.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSitesSummary, getAllTags } from './data';
import { stripPersonalSites } from './interestFilter';
import { useAuth } from './auth';
import type { Site, Tag } from './types';

// Offline cache: the last successful catalog fetch is persisted so the app
// is browsable with no signal (rural pilgrimage sites). Cache is shown
// immediately on launch, then silently replaced by a network refresh.
const CACHE_KEY = 'catalog-cache-v1';

interface CatalogCache {
  sites: Site[];
  tags: Tag[];
  fetchedAt: number;
}

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
  const hasNetworkData = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [siteRows, tagRows] = await Promise.all([getAllSitesSummary(), getAllTags()]);
      hasNetworkData.current = true;
      setAllSites(siteRows);
      setTags(tagRows);
      setLoading(false);
      const cache: CatalogCache = { sites: siteRows, tags: tagRows, fetchedAt: Date.now() };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache)).catch(() => {});
    } catch (e) {
      // Offline with a warm cache is not an error state.
      if (!hasNetworkData.current && allSites.length === 0) {
        setError(e instanceof Error ? e.message : 'Failed to load sites');
      }
      setLoading(false);
    }
  }, [allSites.length]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw || hasNetworkData.current) return;
        const cache = JSON.parse(raw) as CatalogCache;
        if (Array.isArray(cache.sites) && cache.sites.length > 0) {
          setAllSites(cache.sites);
          setTags(cache.tags ?? []);
          setLoading(false);
        }
      })
      .catch(() => {});
    refresh();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
