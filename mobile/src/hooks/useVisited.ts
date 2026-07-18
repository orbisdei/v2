// Port of the web app's useVisited hook: optimistic visited-site toggling.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { getVisitedSiteIds, setVisited } from '../lib/data';

export function useVisited() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setVisitedIds(new Set());
      return;
    }
    getVisitedSiteIds(userId).then(setVisitedIds);
  }, [userId]);

  const isVisited = useCallback((siteId: string) => visitedIds.has(siteId), [visitedIds]);

  const toggleVisited = useCallback(
    async (siteId: string) => {
      if (!userId) return;
      const wasVisited = visitedIds.has(siteId);
      setVisitedIds((prev) => {
        const next = new Set(prev);
        if (wasVisited) next.delete(siteId);
        else next.add(siteId);
        return next;
      });
      const ok = await setVisited(userId, siteId, !wasVisited);
      if (!ok) {
        setVisitedIds((prev) => {
          const next = new Set(prev);
          if (wasVisited) next.add(siteId);
          else next.delete(siteId);
          return next;
        });
      }
    },
    [userId, visitedIds]
  );

  return { isVisited, toggleVisited, isLoggedIn: userId !== null };
}
