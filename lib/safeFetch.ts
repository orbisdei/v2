import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF-hardened fetch for user-supplied URLs (CWE-918).
 *
 * Server routes that fetch a URL a user typed in (image imports, attribution
 * scraping, shortlink resolution) must never be usable to probe internal
 * infrastructure — cloud metadata endpoints, VPC services, localhost, etc.
 * `safeExternalFetch` enforces, on the initial URL AND on every redirect hop:
 *   - http/https only, default ports only, no embedded credentials
 *   - the hostname must not resolve to a private, loopback, link-local,
 *     multicast, or otherwise reserved address (IPv4 and IPv6)
 *
 * Redirects are followed manually (up to MAX_REDIRECTS) so a public URL
 * cannot 302 into a private one.
 */

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPrivateIpv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return true; // "this" network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // link-local (cloud metadata lives here)
  if (a === 172 && b >= 16 && b <= 31) return true; // private 172.16.0.0/12
  if (a === 192 && (b === 0 || b === 168)) return true; // IETF reserved + private
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true; // benchmarking + doc
  if (a === 203 && b === 0) return true; // documentation 203.0.113.0/24
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) return isPrivateIpv4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  if (v6 === '::' || v6 === '::1') return true; // unspecified, loopback
  if (/^f[cd]/.test(v6)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(v6)) return true; // link-local fe80::/10
  if (/^fe[cdf]/.test(v6)) return true; // site-local fec0::/10 (deprecated)
  if (v6.startsWith('64:ff9b')) return true; // NAT64 — can embed private IPv4
  return false;
}

/** Throws unless the URL is http(s) on a default port and its host resolves only to public addresses. */
export async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP(S) URLs are allowed');
  }
  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed');
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new Error('Only default HTTP(S) ports are allowed');
  }

  let hostname = url.hostname;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1); // IPv6 literal
  }

  let addresses: string[];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = (await lookup(hostname, { all: true })).map((r) => r.address);
    } catch {
      throw new Error('Could not resolve host');
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new Error('URL resolves to a private or internal address');
  }
}

/**
 * fetch() a user-supplied URL with SSRF protections. Follows redirects
 * manually, re-validating each hop. The returned Response has already had
 * its redirects resolved; `response.url` is the final URL.
 */
export async function safeExternalFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  let current = typeof input === 'string' ? new URL(input) : input;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(current);
    const response = await fetch(current.toString(), { ...init, redirect: 'manual' });

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;
      await response.body?.cancel();
      current = new URL(location, current);
      continue;
    }

    return response;
  }

  throw new Error('Too many redirects');
}
