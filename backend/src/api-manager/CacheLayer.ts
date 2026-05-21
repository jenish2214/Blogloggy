import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import NodeCache from "node-cache";
import type { CacheConfig, CacheResult } from "./types.js";
import { logger } from "./logger.js";

interface StoredEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  tags: string[];
}

export class CacheLayer {
  private l1: NodeCache;
  private cacheDir: string;
  private tagIndex = new Map<string, Set<string>>();

  constructor(private readonly defaultConfig: CacheConfig) {
    this.l1 = new NodeCache({
      stdTTL: Math.ceil(defaultConfig.ttlMs / 1000),
      maxKeys: defaultConfig.maxEntries,
      useClones: false,
    });
    this.cacheDir =
      process.env.API_CACHE_DIR ?? path.join(process.cwd(), ".cache", "api-manager");
  }

  buildKey(
    sourceId: string,
    endpoint: string,
    params: Record<string, unknown>
  ): string {
    const sorted = JSON.stringify(
      Object.keys(params)
        .sort()
        .reduce(
          (acc, k) => {
            acc[k] = params[k];
            return acc;
          },
          {} as Record<string, unknown>
        )
    );
    const raw = `${sourceId}:${endpoint}:${sorted}`;
    return crypto.createHash("md5").update(raw).digest("hex");
  }

  private filePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  private indexTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private unindexTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      this.tagIndex.get(tag)?.delete(key);
    }
  }

  async get<T>(key: string): Promise<CacheResult<T> | null> {
    const l1Raw = this.l1.get<StoredEntry<T>>(key);
    if (l1Raw) {
      const age = Date.now() - l1Raw.cachedAt;
      const stale = age > l1Raw.ttlMs;
      return {
        data: l1Raw.data,
        servedFrom: stale ? "stale" : "l1",
        age,
        stale,
        tags: l1Raw.tags,
      };
    }

    try {
      const raw = await fs.readFile(this.filePath(key), "utf8");
      const entry = JSON.parse(raw) as StoredEntry<T>;
      const age = Date.now() - entry.cachedAt;
      const stale = age > entry.ttlMs;
      this.l1.set(key, entry, Math.max(1, Math.ceil((entry.ttlMs - age) / 1000)));
      return {
        data: entry.data,
        servedFrom: stale ? "stale" : "l2",
        age,
        stale,
        tags: entry.tags,
      };
    } catch {
      return null;
    }
  }

  async getStale<T>(key: string): Promise<T | null> {
    const hit = await this.get<T>(key);
    if (hit) return hit.data;

    try {
      const raw = await fs.readFile(this.filePath(key), "utf8");
      const entry = JSON.parse(raw) as StoredEntry<T>;
      logger.debug({ msg: "stale_cache_served", key });
      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlMs: number,
    tags: string[] = []
  ): Promise<void> {
    await this.ensureDir();
    const entry: StoredEntry<T> = {
      data: value,
      cachedAt: Date.now(),
      ttlMs,
      tags,
    };

    const old = this.l1.get<StoredEntry<T>>(key);
    if (old) this.unindexTags(key, old.tags);

    this.l1.set(key, entry, Math.max(1, Math.ceil(ttlMs / 1000)));
    this.indexTags(key, tags);

    await fs.writeFile(this.filePath(key), JSON.stringify(entry), "utf8");
  }

  async invalidateByKey(key: string): Promise<void> {
    const old = this.l1.get<StoredEntry<unknown>>(key);
    if (old) this.unindexTags(key, old.tags);
    this.l1.del(key);
    try {
      await fs.unlink(this.filePath(key));
    } catch {
      /* ignore */
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys?.size) return 0;
    let count = 0;
    for (const key of [...keys]) {
      await this.invalidateByKey(key);
      count++;
    }
    this.tagIndex.delete(tag);
    return count;
  }

  /** Extend stale entry TTL when background refresh fails */
  async extendStale(key: string, extraMs = 3_600_000): Promise<void> {
    const l1 = this.l1.get<StoredEntry<unknown>>(key);
    if (l1) {
      l1.ttlMs += extraMs;
      this.l1.set(key, l1);
      await this.ensureDir();
      await fs.writeFile(this.filePath(key), JSON.stringify(l1), "utf8");
    }
  }
}
