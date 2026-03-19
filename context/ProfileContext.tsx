'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useProfile, type Profile } from '@/lib/hooks/useProfile';

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  updateProfile: (updates: { initials?: string; about_me?: string | null }) => Promise<string | undefined>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const profileData = useProfile();
  return (
    <ProfileContext.Provider value={profileData}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider');
  return ctx;
}
