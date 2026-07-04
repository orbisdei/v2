'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

// ---------------------------------------------------------------------------
// Shared auth state (module singleton).
//
// useProfile, useVisited, and useLists each used to call
// supabase.auth.getUser() and register their own onAuthStateChange
// subscription on every page mount — three redundant auth round-trips per
// navigation. This module resolves the user once and fans the result out to
// every hook instance.
// ---------------------------------------------------------------------------

type Listener = (user: User | null) => void;

let currentUser: User | null = null;
let resolved = false; // initial getUser() has completed
let initialized = false;
const listeners = new Set<Listener>();

function ensureInitialized() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    currentUser = user ?? null;
    resolved = true;
    listeners.forEach((fn) => fn(currentUser));
  });
  // Singleton subscription, deliberately never unsubscribed — lives for the
  // page's lifetime, exactly like the per-hook subscriptions it replaces.
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    resolved = true;
    listeners.forEach((fn) => fn(currentUser));
  });
}

/**
 * The authenticated Supabase user, or null. `loading` is true only until the
 * initial getUser() resolves (shared across all consumers).
 */
export function useAuthUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(currentUser);
  const [loading, setLoading] = useState(!resolved);

  useEffect(() => {
    ensureInitialized();
    const listener: Listener = (u) => {
      setUser(u);
      setLoading(false);
    };
    listeners.add(listener);
    // Sync in case auth resolved between render and effect.
    if (resolved) listener(currentUser);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { user, loading };
}
