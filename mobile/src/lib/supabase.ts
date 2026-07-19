import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // EXPO_PUBLIC_ vars are inlined into the JS bundle at build time. If this
  // throws in a dev session, fill in mobile/.env; if it throws in an
  // installed build, the EAS environment (preview/production) is missing
  // EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them with
  // `eas env:create` and rebuild.
  throw new Error(
    'Supabase config missing: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'were not set when this bundle was built (mobile/.env for dev, EAS env vars for builds).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Mobile deep links are handled manually in lib/auth.tsx.
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is foregrounded (Supabase RN guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
