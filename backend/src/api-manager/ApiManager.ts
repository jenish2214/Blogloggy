import axios, { type AxiosRequestConfig } from "axios";
import { ApiSourceRegistry } from "./ApiSourceRegistry.js";
import { BudgetTracker } from "./BudgetTracker.js";
import { CacheLayer } from "./CacheLayer.js";
import { CircuitBreaker } from "./CircuitBreaker.js";
import { CircuitOpenError } from "./types.js";
import { FallbackChain } from "./FallbackChain.js";
import { logApiSuccess, logger } from "./logger.js";
import { MetricsCollector } from "./MetricsCollector.js";
import { RateLimiter } from "./RateLimiter.js";
import { RequestQueue } from "./RequestQueue.js";
import { ResponseNormalizer } from "./ResponseNormalizer.js";
import { RetryEngine } from "./RetryEngine.js";
import type {
  ApiResponse,
  FetchOptions,
  HealthReport,
  MetricsDashboard,
} from "./types.js";

const inflightRefresh = new Set<string>();

export class ApiManager {
  private registry: ApiSourceRegistry;
  private cache: CacheLayer;
  private breakers = new Map<string, CircuitBreaker>();
  private queue = new RequestQueue();
  private limiter = new RateLimiter();
  private retry = new Map<string, RetryEngine>();
  private normalizer = new ResponseNormalizer();
  private fallback: FallbackChain;
  private metrics = new MetricsCollector();
  private budget = new BudgetTracker();
  private startedAt = Date.now();

  constructor(registry?: ApiSourceRegistry) {
    this.registry = registry ?? new ApiSourceRegistry();
    const defaultCache = this.registry.get("arxiv").cache;
    this.cache = new CacheLayer(defaultCache);
    this.fallback = new FallbackChain(this.registry, this.cache, this.metrics);

    for (const [id, config] of Object.entries(this.registry.getAll())) {
      this.breakers.set(id, new CircuitBreaker(id, config.circuitBreaker));
      this.retry.set(id, new RetryEngine(config.retry));
    }
  }

  private getBreaker(sourceId: string): CircuitBreaker {
    return this.breakers.get(sourceId)!;
  }

  private getRetry(sourceId: string): RetryEngine {
    return this.retry.get(sourceId)!;
  }

  private buildUrl(
    config: ReturnType<ApiSourceRegistry["get"]>,
    endpoint: string,
    params: Record<string, unknown>,
    urlOverride?: string
  ): string {
    if (urlOverride) return urlOverride;
    const base = config.baseUrl.replace(/\/$/, "");
    const ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = new URL(`${base}${ep}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async executeHttp<T>(
    sourceId: string,
    url: string,
    config: ReturnType<ApiSourceRegistry["get"]>,
    options?: FetchOptions
  ): Promise<T> {
    const axiosConfig: AxiosRequestConfig = {
      method: options?.method ?? "GET",
      url,
      timeout: config.timeout,
      headers: {
        "User-Agent": "Blogloggy-ApiManager/1.0",
        Accept: "application/json, application/xml, text/xml, */*",
      },
      responseType: options?.responseType ?? "text",
      validateStatus: (s) => s < 500,
    };

    if (sourceId === "newsapi" && process.env.NEWS_API_KEY) {
      axiosConfig.params = { ...(axiosConfig.params as object), apiKey: process.env.NEWS_API_KEY };
    }

    const retryEngine = this.getRetry(sourceId);
    const response = await retryEngine.execute(
      async () => {
        const res = await axios.request<string>(axiosConfig);
        if (res.status === 429) {
          const err = new Error("Rate limited") as Error & { response?: { status: number } };
          err.response = { status: 429 };
          throw err;
        }
        if (res.status >= 400) {
          const err = new Error(`HTTP ${res.status}`) as Error & {
            response?: { status: number };
          };
          err.response = { status: res.status };
          throw err;
        }
        if (options?.responseType === "json") {
          return (typeof res.data === "string"
            ? JSON.parse(res.data)
            : res.data) as T;
        }
        return res.data as T;
      },
      `${sourceId}:${url}`
    );

    return response;
  }

  private backgroundRefresh(
    sourceId: string,
    endpoint: string,
    params: Record<string, unknown>,
    cacheKey: string,
    options?: FetchOptions
  ): void {
    if (inflightRefresh.has(cacheKey)) return;
    inflightRefresh.add(cacheKey);

    setImmediate(async () => {
      try {
        const config = this.registry.get(sourceId);
        const url =
          options?.urlOverride ??
          this.buildUrl(config, endpoint, params, options?.urlOverride);
        const data = await this.executeHttp<unknown>(
          sourceId,
          url,
          config,
          options
        );
        await this.cache.set(cacheKey, data, config.cache.ttlMs, config.cache.tags);
        logger.debug({ msg: "background_refresh_ok", sourceId, cacheKey });
      } catch (err) {
        await this.cache.extendStale(cacheKey);
        logger.warn({
          msg: "background_refresh_failed",
          sourceId,
          cacheKey,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        inflightRefresh.delete(cacheKey);
      }
    });
  }

  async fetch<T>(
    sourceId: string,
    endpoint: string,
    params: Record<string, unknown> = {},
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const start = Date.now();
    const config = this.registry.get(sourceId);
    const cacheKey = this.cache.buildKey(sourceId, endpoint, params);
    const warnings: string[] = [];

    this.metrics.record({ type: "request", sourceId });

    const budgetStatus = this.budget.checkBudget(sourceId);
    if (!budgetStatus.available) {
      logger.warn({ msg: "budget_critical_cache_only", sourceId });
      const stale = await this.cache.getStale<T>(cacheKey);
      if (stale) {
        this.metrics.record({ type: "stale", sourceId });
        return {
          data: stale,
          source: sourceId,
          cacheHit: true,
          stale: true,
          fallback: false,
          latencyMs: Date.now() - start,
          warnings: ["budget_critical: served stale cache"],
        };
      }
      throw new Error(`Budget exhausted for ${sourceId} and no stale cache`);
    }

    if (!options.bypassCache && !options.forceRefresh) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached && !cached.stale) {
        this.metrics.record({ type: "cache_hit", sourceId });
        return {
          data: cached.data,
          source: sourceId,
          cacheHit: true,
          stale: false,
          fallback: false,
          latencyMs: Date.now() - start,
          cachedAt: Date.now() - cached.age,
          warnings,
        };
      }

      if (
        cached &&
        cached.stale &&
        config.cache.staleWhileRevalidate &&
        !options.forceRefresh
      ) {
        this.backgroundRefresh(sourceId, endpoint, params, cacheKey, options);
        this.metrics.record({ type: "stale", sourceId });
        return {
          data: cached.data,
          source: sourceId,
          cacheHit: true,
          stale: true,
          fallback: false,
          latencyMs: Date.now() - start,
          warnings,
        };
      }
    }

    this.metrics.record({ type: "cache_miss", sourceId });

    const breaker = this.getBreaker(sourceId);
    this.metrics.setCircuitState(sourceId, breaker.getState().state);

    if (!breaker.isAvailable()) {
      const stale = await this.cache.getStale<T>(cacheKey);
      if (stale) {
        this.metrics.record({ type: "stale", sourceId });
        return {
          data: stale,
          source: sourceId,
          cacheHit: true,
          stale: true,
          fallback: false,
          latencyMs: Date.now() - start,
          warnings: ["circuit_open: served stale"],
        };
      }
      throw new CircuitOpenError(sourceId);
    }

    const waitStart = Date.now();
    await this.limiter.waitForToken(sourceId, config.rateLimit);
    if (Date.now() - waitStart > 100) {
      this.metrics.record({ type: "rate_limit_wait", sourceId });
    }

    const priority = options.priority ?? "normal";

    const fetchFn = async (sid: string): Promise<T> => {
      if (sid !== sourceId) {
        throw new Error(
          `HTTP fallback skipped for incompatible source ${sid} (use stale cache)`
        );
      }
      const srcConfig = this.registry.get(sid);
      const url =
        options.urlOverride ??
        this.buildUrl(srcConfig, endpoint, params, options.urlOverride);

      return this.queue.enqueue(
        sid,
        srcConfig.concurrency,
        priority,
        async () => {
          const data = await this.executeHttp<T>(sid, url, srcConfig, options);
          this.budget.consume(sid);
          return data;
        }
      );
    };

    try {
      const result = await this.fallback.execute<T>(
        sourceId,
        cacheKey,
        fetchFn
      );

      const usedBreaker = this.getBreaker(result.sourceUsed);
      usedBreaker.recordSuccess();
      if (result.sourceUsed === sourceId) {
        breaker.recordSuccess();
      }

      let data = result.data;
      if (options.schema) {
        const norm = this.normalizer.normalize(data, result.sourceUsed, options.schema);
        data = norm.data;
        warnings.push(...norm.warnings);
      }

      if (!result.stale) {
        const srcConfig = this.registry.get(result.sourceUsed);
        await this.cache.set(
          cacheKey,
          data,
          srcConfig.cache.ttlMs,
          srcConfig.cache.tags
        );
      }

      const latencyMs = Date.now() - start;
      this.metrics.record({
        type: "api_call",
        sourceId: result.sourceUsed,
        latencyMs,
      });

      logApiSuccess({
        sourceId: result.sourceUsed,
        endpoint,
        latencyMs,
        cacheHit: false,
        attempt: 1,
        fallback: result.fallback,
        budgetLeft: this.budget.checkBudget(sourceId).remaining,
      });

      return {
        data,
        source: result.sourceUsed,
        cacheHit: false,
        stale: result.stale,
        fallback: result.fallback,
        latencyMs,
        warnings,
      };
    } catch (err) {
      breaker.recordFailure();
      this.metrics.record({
        type: "error",
        sourceId,
        error: err instanceof Error ? err.message : String(err),
      });

      const stale = await this.cache.getStale<T>(cacheKey);
      if (stale) {
        this.metrics.record({ type: "stale", sourceId });
        return {
          data: stale,
          source: sourceId,
          cacheHit: true,
          stale: true,
          fallback: true,
          latencyMs: Date.now() - start,
          warnings: ["error: served stale fallback"],
        };
      }
      throw err;
    }
  }

  async invalidate(tags: string[]): Promise<number> {
    let total = 0;
    for (const tag of tags) {
      total += await this.cache.invalidateByTag(tag);
    }
    return total;
  }

  getMetrics(): MetricsDashboard {
    return this.metrics.getAll();
  }

  getMetricsSummary(): string {
    return this.metrics.getSummary();
  }

  getHealth(): HealthReport {
    const sources: HealthReport["sources"] = {};
    let openCount = 0;
    let totalErrors = 0;
    let totalRequests = 0;

    for (const [id, config] of Object.entries(this.registry.getAll())) {
      const m = this.metrics.getAll().sources[id];
      const breaker = this.getBreaker(id);
      const state = breaker.getState().state;
      if (state === "OPEN") openCount++;

      const reqs = m?.totalRequests ?? 0;
      const errs = m?.errors ?? 0;
      totalRequests += reqs;
      totalErrors += errs;

      const cacheHitRate =
        reqs > 0 ? Math.round(((m?.cacheHits ?? 0) / reqs) * 100) : 0;
      const errorRate = reqs > 0 ? Math.round((errs / reqs) * 100) : 0;

      sources[id] = {
        circuitState: state,
        lastSuccess: m?.lastSuccessAt
          ? new Date(m.lastSuccessAt).toISOString()
          : null,
        lastError: m?.lastErrorAt
          ? new Date(m.lastErrorAt).toISOString()
          : null,
        cacheHitRate,
        avgLatencyMs: Math.round(m?.avgLatencyMs ?? 0),
        errorRate,
        queueDepth: this.queue.getQueueStats(id).pending,
        rateTokens: this.limiter.getStatus(id, config.rateLimit).tokens,
        budgetRemaining: this.budget.checkBudget(id).remaining,
      };
    }

    const overallErrorRate =
      totalRequests > 0
        ? Math.round((totalErrors / totalRequests) * 100)
        : 0;

    let status: HealthReport["status"] = "healthy";
    if (openCount >= 2 || overallErrorRate > 30) status = "critical";
    else if (openCount >= 1) status = "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      sources,
    };
  }

  getBudgetTracker(): BudgetTracker {
    return this.budget;
  }

  getCache(): CacheLayer {
    return this.cache;
  }

  getRegistry(): ApiSourceRegistry {
    return this.registry;
  }
}
