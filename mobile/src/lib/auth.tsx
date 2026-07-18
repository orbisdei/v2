// Auth context: one Supabase session + profile shared app-wide
// (mobile equivalent of the web app's useAuthUser singleton).
// Google OAuth runs through the system browser and returns via the
// app's deep-link scheme (orbisdei://auth/callback).

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  initials: string;
  initials_display: string;
  about_me: string | null;
  role: 'general' | 'contributor' | 'administrator';
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

const redirectTo = makeRedirectUri({ path: 'auth/callback' });

async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Cold-start / backgrounded deep links (browser redirect while app was closed).
  const incomingUrl = Linking.useLinkingURL();
  useEffect(() => {
    if (incomingUrl?.includes('auth/callback')) {
      createSessionFromUrl(incomingUrl).catch(() => {});
    }
  }, [incomingUrl]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url, initials, initials_display, about_me, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile((data as Profile) ?? null));
  }, [session?.user?.id]);

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success' && res.url) {
      await createSessionFromUrl(res.url);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
