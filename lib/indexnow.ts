// IndexNow — instant URL-change pings to Bing-family search engines
// (Bing, Yandex, Naver, Seznam; DuckDuckGo consumes Bing's index).
// Server-only: call from API routes or server actions, never the browser.

// The key is deliberately public — search engines verify host ownership by
// fetching /{key}.txt (checked into public/), so it is not a secret.
export const INDEXNOW_KEY = '3a515303883c006a7244fb167298e445';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Notify IndexNow that pages changed (created, updated, deleted, or now
 * redirecting). Takes site-relative paths like '/site/xyz'. Fire-and-forget:
 * never throws, so callers don't need to handle failures.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://orbisdei.org';
  const host = new URL(base).host;
  // Don't ping from local dev — the key file isn't reachable there.
  if (host.includes('localhost') || host.includes('127.0.0.1')) return;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
        urlList: paths.map((p) => `${base}${p}`),
      }),
    });
    if (!res.ok && res.status !== 202) {
      console.warn(`[indexnow] ping returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[indexnow] ping failed (non-fatal):', err);
  }
}
