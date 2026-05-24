/**
 * In-memory GET cache + in-flight deduplication for faster repeat loads in the browser.
 */

type CacheEntry = { data: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function getClientCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  return null;
}

export function setClientCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Return expired cache for stale-while-revalidate fallbacks. */
export function getClientCacheStale<T>(key: string): T | null {
  const hit = cache.get(key);
  return hit ? (hit.data as T) : null;
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options?: { force?: boolean }
): Promise<T> {
  if (!options?.force) {
    const hit = getClientCache<T>(key);
    if (hit) return hit;
  }

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      setClientCache(key, data, ttlMs);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      const stale = getClientCacheStale<T>(key);
      if (stale) return stale;
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
