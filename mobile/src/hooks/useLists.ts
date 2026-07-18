// Port of the web app's useLists hook (the subset the mobile app needs):
// list membership lookups + optimistic toggle + create.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  createList as createListDb,
  getListsWithSiteIds,
  setSiteOnList,
  type ListWithSiteIds,
} from '../lib/data';

interface ListState {
  id: string;
  name: string;
  is_public: boolean;
  siteIds: Set<string>;
}

export function useLists() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [lists, setLists] = useState<ListState[]>([]);

  useEffect(() => {
    if (!userId) {
      setLists([]);
      return;
    }
    let cancelled = false;
    getListsWithSiteIds(userId).then((rows: ListWithSiteIds[]) => {
      if (cancelled) return;
      setLists(
        rows.map((l) => ({ id: l.id, name: l.name, is_public: l.is_public, siteIds: new Set(l.site_ids) }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isOnAnyList = useCallback(
    (siteId: string) => lists.some((l) => l.siteIds.has(siteId)),
    [lists]
  );

  const toggleSiteOnList = useCallback(
    async (siteId: string, listId: string) => {
      if (!userId) return;
      const list = lists.find((l) => l.id === listId);
      if (!list) return;
      const wasOn = list.siteIds.has(siteId);
      const apply = (on: boolean) =>
        setLists((prev) =>
          prev.map((l) => {
            if (l.id !== listId) return l;
            const next = new Set(l.siteIds);
            if (on) next.add(siteId);
            else next.delete(siteId);
            return { ...l, siteIds: next };
          })
        );
      apply(!wasOn);
      const ok = await setSiteOnList(listId, siteId, !wasOn);
      if (!ok) apply(wasOn);
    },
    [userId, lists]
  );

  const createList = useCallback(
    async (name: string): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const created = await createListDb(userId, name);
      if (!created) return null;
      setLists((prev) => [
        ...prev,
        { id: created.id, name: created.name, is_public: created.is_public, siteIds: new Set() },
      ]);
      return created.id;
    },
    [userId]
  );

  return { lists, isOnAnyList, toggleSiteOnList, createList, isLoggedIn: userId !== null };
}
