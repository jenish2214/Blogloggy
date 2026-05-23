import type { z } from "zod";

export interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
  burstAllowance: number;
}

export interface CacheConfig {
  ttlMs: number;
  staleWhileRevalidate: boolean;
  maxEntries: number;
  tags: string[];
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  retryOn: number[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  halfOpenAfterMs: number;
}

export interface ApiSourceConfig {
  id: string;
  baseUrl: string;
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  retry: RetryConfig;
  circuitBreaker: CircuitBreakerConfig;
  concurrency: number;
  timeout: number;
  fallbackSourceId?: string;
  healthCheckUrl?: string;
}

export interface CacheResult<T> {
  data: T;
  servedFrom: "l1" | "l2" | "stale";
  age: number;
  stale: boolean;
  tags: string[];
}

export interface CircuitState {
  state: "CLOSED" | "OPEN" | "HALF-OPEN";
  failures: number;
  successes: number;
  openedAt: number | null;
  halfOpenAt: number | null;
}

export interface FallbackAttempt {
  sourceId: string;
  success: boolean;
  error?: string;
  latencyMs?: number;
}

export interface FallbackResult<T> {
  data: T;
  sourceUsed: string;
  fallback: boolean;
  stale: boolean;
  chain: FallbackAttempt[];
}

export interface NormalizationResult<T> {
  data: T;
  valid: boolean;
  warnings: string[];
}

export interface NormalizedPaper {
  id: string;
  title: string;
  abstract: string;
  authors: { name: string; affiliation?: string }[];
  publishedAt: string;
  source: string;
  sourceUrl: string;
  categories: string[];
  citationCount: number;
  year: number;
}

export interface NormalizedFeedItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  source: string;
  sourceUrl: string;
  logoKey: string;
}

export interface ApiResponse<T> {
  data: T;
  source: string;
  cacheHit: boolean;
  stale: boolean;
  fallback: boolean;
  latencyMs: number;
  cachedAt?: number;
  warnings: string[];
}

export interface FetchOptions {
  priority?: "high" | "normal" | "low";
  bypassCache?: boolean;
  forceRefresh?: boolean;
  schema?: z.ZodSchema;
  method?: "GET" | "POST";
  urlOverride?: string;
  responseType?: "json" | "text";
}

export type MetricEventType =
  | "request"
  | "cache_hit"
  | "cache_miss"
  | "api_call"
  | "fallback"
  | "stale"
  | "error"
  | "retry"
  | "rate_limit_wait";

export interface MetricEvent {
  type: MetricEventType;
  sourceId: string;
  latencyMs?: number;
  error?: string;
}

export interface SourceMetrics {
  sourceId: string;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  fallbackUsed: number;
  staleServed: number;
  errors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  circuitState: string;
  rateLimitWaits: number;
  retriesTotal: number;
  latencies: number[];
}

export interface MetricsDashboard {
  generatedAt: string;
  sources: Record<string, SourceMetrics>;
  totals: {
    requests: number;
    cacheHits: number;
    apiCalls: number;
    errors: number;
    fallbackUsed: number;
    staleServed: number;
  };
}

export interface HealthReport {
  status: "healthy" | "degraded" | "critical";
  timestamp: string;
  uptime: number;
  sources: Record<
    string,
    {
      circuitState: string;
      lastSuccess: string | null;
      lastError: string | null;
      cacheHitRate: number;
      avgLatencyMs: number;
      errorRate: number;
      queueDepth: number;
      rateTokens: number;
      budgetRemaining?: number;
    }
  >;
}

export interface BudgetStatus {
  available: boolean;
  remaining: number;
  resetsAt: Date;
  warningLevel: "ok" | "low" | "critical";
}

export interface QueueStats {
  pending: number;
  inFlight: number;
  completed: number;
  failed: number;
}

export interface BucketStatus {
  tokens: number;
  capacity: number;
  nextRefillMs: number;
  requestsThisWindow: number;
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError?: unknown
  ) {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

export class FallbackExhaustedError extends Error {
  constructor(
    message: string,
    public readonly chain: FallbackAttempt[]
  ) {
    super(message);
    this.name = "FallbackExhaustedError";
  }
}

export class CircuitOpenError extends Error {
  constructor(public readonly sourceId: string) {
    super(`Circuit breaker OPEN for ${sourceId}`);
    this.name = "CircuitOpenError";
  }
}
