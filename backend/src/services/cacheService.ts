import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  source: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "../../.cache");

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const TTL = {
  arxiv: 900_000,
  semantic: 900_000,
  pubmed: 900_000,
  rss: 300_000,
  news: 300_000,
  ai: 3_600_000,
  research: 300_000,
  digest: 3_600_000,
} as const;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function fileKey(key: string): string {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`);
}

export function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.cachedAt < entry.ttlMs) {
    return entry.data;
  }
  if (entry) memoryCache.delete(key);

  try {
    ensureCacheDir();
    const fp = fileKey(key);
    if (!fs.existsSync(fp)) return null;
    const raw = JSON.parse(fs.readFileSync(fp, "utf-8")) as CacheEntry<T>;
    if (Date.now() - raw.cachedAt < raw.ttlMs) {
      memoryCache.set(key, raw);
      return raw.data;
    }
    fs.unlinkSync(fp);
  } catch {
    /* ignore */
  }
  return null;
}

export function setCache<T>(
  key: string,
  data: T,
  ttlMs: number,
  source: string
): void {
  const entry: CacheEntry<T> = {
    data,
    cachedAt: Date.now(),
    ttlMs,
    source,
  };
  memoryCache.set(key, entry as CacheEntry<unknown>);
  try {
    ensureCacheDir();
    fs.writeFileSync(fileKey(key), JSON.stringify(entry));
  } catch {
    /* ignore file write */
  }
}

export function getLastAIResult(promptHash: string): string | null {
  const key = `ai:${promptHash}`;
  const cached = getCache<{ content: string }>(key);
  return cached?.content ?? null;
}

export function setLastAIResult(promptHash: string, content: string): void {
  setCache(`ai:${promptHash}`, { content }, TTL.ai, "ai");
}

export function hashPrompt(prompt: string, context?: string): string {
  const str = `${prompt}::${context ?? ""}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
