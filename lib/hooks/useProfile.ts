'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  initials: string;
  initials_display: string;
  about_me: string | null;
  role: 'general' | 'contributor' | 'administrator';
  created_at: string;
  updated_at: string;
};

function generateInitialsFromName(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return (words[0][0] + words[0][0] + words[0][0]).toUpperCase();
  return 'USR';
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function fetchOrCreateProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!mounted) return;

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // No profile row — create one for existing users
      const fullName = authUser.user_metadata?.full_name ?? '';
      const rawInitials = generateInitialsFromName(fullName);

      const { data: uniqueInitials } = await supabase.rpc('generate_unique_initials', {
        p_initials: rawInitials,
      });
      const initialsDisplay: string = uniqueInitials ?? rawInitials;

      const newProfile = {
        id: authUser.id,
        display_name: fullName || null,
        email: authUser.email ?? null,
        avatar_url: authUser.user_metadata?.avatar_url ?? null,
        initials: rawInitials,
        initials_display: initialsDisplay,
        about_me: null,
        role: 'general' as const,
      };

      const { data: created } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (mounted) setProfile((created ?? newProfile) as Profile);
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (user) {
        await fetchOrCreateProfile(user as Parameters<typeof fetchOrCreateProfile>[0]);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setLoading(true);
        fetchOrCreateProfile(session.user as Parameters<typeof fetchOrCreateProfile>[0]).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function updateProfile(updates: { initials?: string; about_me?: string | null }) {
    if (!profile) return;
    const supabase = createClient();

    let initialsDisplay = profile.initials_display;
    if (updates.initials !== undefined && updates.initials !== profile.initials) {
      const { data: unique } = await supabase.rpc('generate_unique_initials', {
        p_initials: updates.initials,
      });
      initialsDisplay = unique ?? updates.initials;
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.initials !== undefined) {
      patch.initials = updates.initials;
      patch.initials_display = initialsDisplay;
    }
    if ('about_me' in updates) patch.about_me = updates.about_me;

    const { data } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', profile.id)
      .select()
      .single();

    if (data) setProfile(data as Profile);
    return initialsDisplay;
  }

  return { profile, loading, updateProfile };
}
