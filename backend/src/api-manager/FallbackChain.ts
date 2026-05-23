import type { ApiSourceRegistry } from "./ApiSourceRegistry.js";
import type { CacheLayer } from "./CacheLayer.js";
import type { MetricsCollector } from "./MetricsCollector.js";
import type { FallbackAttempt, FallbackResult } from "./types.js";
import { FallbackExhaustedError } from "./types.js";
import { logger } from "./logger.js";

export class FallbackChain {
  constructor(
    private readonly registry: ApiSourceRegistry,
    private readonly cache: CacheLayer,
    private readonly metrics: MetricsCollector
  ) {}

  private async tryStaleCache<T>(cacheKey: string): Promise<T | null> {
    return this.cache.getStale<T>(cacheKey);
  }

  async execute<T>(
    primarySourceId: string,
    cacheKey: string,
    fetchFn: (sourceId: string) => Promise<T>,
    transform?: (data: unknown, sourceId: string) => T
  ): Promise<FallbackResult<T>> {
    const chainIds = [
      ...this.registry.getFallbackChain(primarySourceId),
      "stale-cache",
    ];
    const attempts: FallbackAttempt[] = [];
    const errors: string[] = [];

    for (const sourceId of chainIds) {
      if (sourceId === "stale-cache") {
        const stale = await this.tryStaleCache<T>(cacheKey);
        attempts.push({
          sourceId: "stale-cache",
          success: stale !== null,
        });
        if (stale !== null) {
          this.metrics.record({ type: "stale", sourceId: primarySourceId });
          return {
            data: stale,
            sourceUsed: "stale-cache",
            fallback: true,
            stale: true,
            chain: attempts,
          };
        }
        continue;
      }

      const start = Date.now();
      try {
        const raw = await fetchFn(sourceId);
        const data = transform ? transform(raw, sourceId) : (raw as T);
        attempts.push({
          sourceId,
          success: true,
          latencyMs: Date.now() - start,
        });
        const isFallback = sourceId !== primarySourceId;
        if (isFallback) {
          this.metrics.record({ type: "fallback", sourceId: primarySourceId });
        }
        return {
          data,
          sourceUsed: sourceId,
          fallback: isFallback,
          stale: false,
          chain: attempts,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${sourceId}: ${msg}`);
        attempts.push({
          sourceId,
          success: false,
          error: msg,
          latencyMs: Date.now() - start,
        });
        logger.warn({
          msg: "fallback_attempt_failed",
          sourceId,
          error: msg,
        });
      }
    }

    throw new FallbackExhaustedError(
      `All sources exhausted: ${errors.join("; ")}`,
      attempts
    );
  }
}
