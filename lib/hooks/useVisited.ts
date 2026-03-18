import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useVisited() {
  const [userId, setUserId] = useState<string | null>(null);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
      : await supabase.from('visited_sites').insert({ user_id: userId, site_id: siteId });
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
