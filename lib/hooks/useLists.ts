import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface ListWithSites {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  site_ids: string[];
}

interface ListState {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  siteIds: Set<string>;
}

export function useLists() {
  const { user } = useAuthUser();
  const userId = user?.id ?? null;
  const [lists, setLists] = useState<ListState[]>([]);

  useEffect(() => {
    if (!userId) { setLists([]); return; }
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      // Default lists ("Favorites", "Want to visit") are created by the
      // on_auth_user_created_lists DB trigger — no client-side creation here.
      const { data: listsData } = await supabase
        .from('user_lists').select('id, name, description, is_public')
        .eq('user_id', userId).order('created_at');
      if (cancelled) return;
      const listIds = (listsData ?? []).map((l: { id: string }) => l.id);
      const { data: itemsData } = listIds.length
        ? await supabase.from('user_list_items').select('list_id, site_id').in('list_id', listIds)
        : { data: [] };
      const siteIdsByList = new Map<string, Set<string>>();
      (listsData ?? []).forEach((l: { id: string }) => siteIdsByList.set(l.id, new Set()));
      (itemsData ?? []).forEach((item: { list_id: string; site_id: string }) => {
        siteIdsByList.get(item.list_id)?.add(item.site_id);
      });
      setLists((listsData ?? []).map((l: { id: string; name: string; description: string; is_public: boolean }) => ({
        id: l.id, name: l.name, description: l.description, is_public: l.is_public,
        siteIds: siteIdsByList.get(l.id) ?? new Set(),
      })));
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const getAllLists = useCallback((): ListWithSites[] =>
    lists.map(l => ({ id: l.id, name: l.name, description: l.description, is_public: l.is_public, site_ids: Array.from(l.siteIds) })),
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
      .from('user_lists').insert({ user_id: userId, name: name.trim(), description: '', is_public: false })
      .select('id, name, description, is_public').single();
    if (!error && data) {
      setLists(prev => [...prev, { id: data.id, name: data.name, description: data.description, is_public: data.is_public, siteIds: new Set() }]);
      return data.id;
    }
    return null;
  }, [userId]);

  const updateList = useCallback(async (listId: string, updates: { name?: string; description?: string; is_public?: boolean }) => {
    if (!userId) return;
    setLists(prev => prev.map(l => l.id === listId ? { ...l, ...updates } : l));
    const supabase = createClient();
    const { error } = await supabase
      .from('user_lists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', listId);
    if (error) {
      console.error('Failed to update list:', error);
    }
  }, [userId]);

  const deleteList = useCallback(async (listId: string) => {
    if (!userId) return;
    setLists(prev => prev.filter(l => l.id !== listId));
    const supabase = createClient();
    await supabase.from('user_list_items').delete().eq('list_id', listId);
    await supabase.from('user_lists').delete().eq('id', listId);
  }, [userId]);

  const reorderItems = useCallback(async (listId: string, orderedSiteIds: string[]) => {
    if (!userId) return;
    const supabase = createClient();
    const updates = orderedSiteIds.map((siteId, idx) =>
      supabase
        .from('user_list_items')
        .update({ display_order: idx })
        .eq('list_id', listId)
        .eq('site_id', siteId)
    );
    await Promise.all(updates);
  }, [userId]);

  const removeFromList = useCallback(async (siteId: string, listId: string) => {
    if (!userId) return;
    setLists(prev => prev.map(l => {
      if (l.id !== listId) return l;
      const next = new Set(l.siteIds);
      next.delete(siteId);
      return { ...l, siteIds: next };
    }));
    const supabase = createClient();
    await supabase.from('user_list_items').delete().eq('list_id', listId).eq('site_id', siteId);
  }, [userId]);

  return {
    getAllLists,
    isOnAnyList,
    getListsForSite,
    toggleSiteOnList,
    createList,
    updateList,
    deleteList,
    reorderItems,
    removeFromList,
    isLoggedIn: userId !== null,
  };
}
