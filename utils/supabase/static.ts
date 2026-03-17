import { createClient } from '@supabase/supabase-js';

/**
 * Cookie-free Supabase client for build-time contexts (generateStaticParams).
 * Do NOT use in request-scoped Server Components or Route Handlers — use server.ts there.
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
