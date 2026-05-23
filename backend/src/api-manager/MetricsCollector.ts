import type {
  MetricEvent,
  MetricsDashboard,
  SourceMetrics,
} from "./types.js";

function emptyMetrics(sourceId: string): SourceMetrics {
  return {
    sourceId,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    fallbackUsed: 0,
    staleServed: 0,
    errors: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    lastSuccessAt: null,
    lastErrorAt: null,
    circuitState: "CLOSED",
    rateLimitWaits: 0,
    retriesTotal: 0,
    latencies: [],
  };
}

function p95(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

export class MetricsCollector {
  private metrics = new Map<string, SourceMetrics>();

  private get(sourceId: string): SourceMetrics {
    if (!this.metrics.has(sourceId)) {
      this.metrics.set(sourceId, emptyMetrics(sourceId));
    }
    return this.metrics.get(sourceId)!;
  }

  record(event: MetricEvent): void {
    const m = this.get(event.sourceId);
    m.totalRequests++;

    switch (event.type) {
      case "cache_hit":
        m.cacheHits++;
        break;
      case "cache_miss":
        m.cacheMisses++;
        break;
      case "api_call":
        m.apiCalls++;
        if (event.latencyMs !== undefined) {
          m.latencies.push(event.latencyMs);
          if (m.latencies.length > 200) m.latencies.shift();
          m.avgLatencyMs =
            m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length;
          m.p95LatencyMs = p95(m.latencies);
        }
        m.lastSuccessAt = Date.now();
        break;
      case "fallback":
        m.fallbackUsed++;
        break;
      case "stale":
        m.staleServed++;
        break;
      case "error":
        m.errors++;
        m.lastErrorAt = Date.now();
        break;
      case "rate_limit_wait":
        m.rateLimitWaits++;
        break;
      case "retry":
        m.retriesTotal++;
        break;
      default:
        break;
    }
  }

  setCircuitState(sourceId: string, state: string): void {
    this.get(sourceId).circuitState = state;
  }

  getAll(): MetricsDashboard {
    const sources: Record<string, SourceMetrics> = {};
    let requests = 0;
    let cacheHits = 0;
    let apiCalls = 0;
    let errors = 0;
    let fallbackUsed = 0;
    let staleServed = 0;

    for (const [id, m] of this.metrics) {
      sources[id] = { ...m, latencies: [...m.latencies] };
      requests += m.totalRequests;
      cacheHits += m.cacheHits;
      apiCalls += m.apiCalls;
      errors += m.errors;
      fallbackUsed += m.fallbackUsed;
      staleServed += m.staleServed;
    }

    return {
      generatedAt: new Date().toISOString(),
      sources,
      totals: {
        requests,
        cacheHits,
        apiCalls,
        errors,
        fallbackUsed,
        staleServed,
      },
    };
  }

  getSummary(): string {
    const dash = this.getAll();
    const lines = ["API Metrics Summary", "─".repeat(60)];
    for (const [id, m] of Object.entries(dash.sources)) {
      const hitRate =
        m.totalRequests > 0
          ? ((m.cacheHits / m.totalRequests) * 100).toFixed(1)
          : "0";
      lines.push(
        `${id.padEnd(18)} hits=${hitRate}% api=${m.apiCalls} err=${m.errors} circuit=${m.circuitState} p95=${Math.round(m.p95LatencyMs)}ms`
      );
    }
    return lines.join("\n");
  }
}
