import { createBrowserClient } from '@supabase/ssr';

// Memoize the browser client across the tab. createBrowserClient wires its own
// auth listeners per instance; spawning one per component call (which happened
// on every render in client components) multiplies those listeners and the
// underlying fetcher. A single shared instance is correct on the browser.
let cachedClient: ReturnType<typeof makeClient> | null = null;

function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createClient() {
  if (cachedClient) return cachedClient;
  cachedClient = makeClient();
  return cachedClient;
}
