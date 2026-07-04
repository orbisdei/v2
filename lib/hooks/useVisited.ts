import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthUser } from './useAuthUser';

export function useVisited() {
  const { user } = useAuthUser();
  const userId = user?.id ?? null;
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) { setVisitedIds(new Set()); return; }
    const supabase = createClient();
    supabase
      .from('visited_sites')
      .select('site_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setVisitedIds(new Set(data.map((r: { site_id: string }) => r.site_id)));
      });
  }, [userId]);

  const isVisited = useCallback((siteId: string) => visitedIds.has(siteId), [visitedIds]);

  const toggleVisited = useCallback(async (siteId: string) => {
    if (!userId) return;
    const wasVisited = visitedIds.has(siteId);
    setVisitedIds(prev => {
      const next = new Set(prev);
      if (wasVisited) next.delete(siteId); else next.add(siteId);
      return next;
    });
    const supabase = createClient();
    const { error } = wasVisited
      ? await supabase.from('visited_sites').delete().eq('user_id', userId).eq('site_id', siteId)
      : await supabase.from('visited_sites').upsert({ user_id: userId, site_id: siteId }, { ignoreDuplicates: true });
    if (error) {
      setVisitedIds(prev => {
        const next = new Set(prev);
        if (wasVisited) next.add(siteId); else next.delete(siteId);
        return next;
      });
    }
  }, [userId, visitedIds]);

  return { isVisited, toggleVisited, isLoggedIn: userId !== null };
}
