import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface ListWithSites {
  id: string;
  name: string;
  description: string;
  site_ids: string[];
}

interface ListState {
  id: string;
  name: string;
  description: string;
  siteIds: Set<string>;
}

export function useLists() {
  const [userId, setUserId] = useState<string | null>(null);
  const [lists, setLists] = useState<ListState[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setLists([]); return; }
    async function load() {
      const supabase = createClient();
      let { data: listsData } = await supabase
        .from('user_lists').select('id, name, description')
        .eq('user_id', userId).order('created_at');
      if (!listsData || listsData.length === 0) {
        await supabase.from('user_lists').insert([
          { user_id: userId, name: 'Favorites', description: '' },
          { user_id: userId, name: 'Want to visit', description: '' },
        ]);
        ({ data: listsData } = await supabase
          .from('user_lists').select('id, name, description')
          .eq('user_id', userId).order('created_at'));
      }
      const listIds = (listsData ?? []).map((l: { id: string }) => l.id);
      const { data: itemsData } = listIds.length
        ? await supabase.from('user_list_items').select('list_id, site_id').in('list_id', listIds)
        : { data: [] };
      const siteIdsByList = new Map<string, Set<string>>();
      (listsData ?? []).forEach((l: { id: string }) => siteIdsByList.set(l.id, new Set()));
      (itemsData ?? []).forEach((item: { list_id: string; site_id: string }) => {
        siteIdsByList.get(item.list_id)?.add(item.site_id);
      });
      setLists((listsData ?? []).map((l: { id: string; name: string; description: string }) => ({
        id: l.id, name: l.name, description: l.description,
        siteIds: siteIdsByList.get(l.id) ?? new Set(),
      })));
    }
    load();
  }, [userId]);

  const getAllLists = useCallback((): ListWithSites[] =>
    lists.map(l => ({ id: l.id, name: l.name, description: l.description, site_ids: Array.from(l.siteIds) })),
    [lists]);

  const isOnAnyList = useCallback((siteId: string) =>
    lists.some(l => l.siteIds.has(siteId)), [lists]);

  const getListsForSite = useCallback((siteId: string) =>
    lists.filter(l => l.siteIds.has(siteId)).map(l => l.id), [lists]);

  const toggleSiteOnList = useCallback(async (siteId: string, listId: string) => {
    if (!userId) return;
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    const wasOn = list.siteIds.has(siteId);
    setLists(prev => prev.map(l => {
      if (l.id !== listId) return l;
      const next = new Set(l.siteIds);
      if (wasOn) next.delete(siteId); else next.add(siteId);
      return { ...l, siteIds: next };
    }));
    const supabase = createClient();
    const { error } = wasOn
      ? await supabase.from('user_list_items').delete().eq('list_id', listId).eq('site_id', siteId)
      : await supabase.from('user_list_items').insert({ list_id: listId, site_id: siteId });
    if (error) {
      setLists(prev => prev.map(l => {
        if (l.id !== listId) return l;
        const next = new Set(l.siteIds);
        if (wasOn) next.add(siteId); else next.delete(siteId);
        return { ...l, siteIds: next };
      }));
    }
  }, [userId, lists]);

  const createList = useCallback(async (name: string): Promise<string | null> => {
    if (!userId || !name.trim()) return null;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_lists').insert({ user_id: userId, name: name.trim(), description: '' })
      .select('id, name, description').single();
    if (!error && data) {
      setLists(prev => [...prev, { id: data.id, name: data.name, description: data.description, siteIds: new Set() }]);
      return data.id;
    }
    return null;
  }, [userId]);

  return { getAllLists, isOnAnyList, getListsForSite, toggleSiteOnList, createList, isLoggedIn: userId !== null };
}
