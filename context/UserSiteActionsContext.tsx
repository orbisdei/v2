'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useVisited } from '@/lib/hooks/useVisited';
import { useLists } from '@/lib/hooks/useLists';

type VisitedValue = ReturnType<typeof useVisited>;
type ListsValue = ReturnType<typeof useLists>;

interface ContextValue {
  visited: VisitedValue;
  lists: ListsValue;
}

const UserSiteActionsContext = createContext<ContextValue | null>(null);

export function UserSiteActionsProvider({ children }: { children: ReactNode }) {
  const visited = useVisited();
  const lists = useLists();
  return (
    <UserSiteActionsContext.Provider value={{ visited, lists }}>
      {children}
    </UserSiteActionsContext.Provider>
  );
}

export function useUserSiteActions() {
  const ctx = useContext(UserSiteActionsContext);
  if (!ctx) throw new Error('useUserSiteActions must be used within UserSiteActionsProvider');
  return ctx;
}
