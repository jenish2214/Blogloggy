import type { ApiSourceConfig } from "./types.js";

export const SOURCES: Record<string, ApiSourceConfig> = {
  arxiv: {
    id: "arxiv",
    baseUrl: "https://export.arxiv.org/api",
    rateLimit: { requestsPerWindow: 3, windowMs: 1000, burstAllowance: 2 },
    cache: {
      ttlMs: 900_000,
      staleWhileRevalidate: true,
      maxEntries: 200,
      tags: ["research", "papers"],
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      jitterFactor: 0.3,
      retryOn: [429, 500, 502, 503, 504],
    },
    circuitBreaker: {
      failureThreshold: 5,
      successThreshold: 2,
      halfOpenAfterMs: 30_000,
    },
    concurrency: 2,
    timeout: 10_000,
    fallbackSourceId: "semantic-scholar",
  },

  "semantic-scholar": {
    id: "semantic-scholar",
    baseUrl: "https://api.semanticscholar.org/graph/v1",
    rateLimit: { requestsPerWindow: 1, windowMs: 1000, burstAllowance: 3 },
    cache: {
      ttlMs: 900_000,
      staleWhileRevalidate: true,
      maxEntries: 300,
      tags: ["research", "papers", "citations"],
    },
    retry: {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 15_000,
      jitterFactor: 0.4,
      retryOn: [429, 500, 503],
    },
    circuitBreaker: {
      failureThreshold: 4,
      successThreshold: 2,
      halfOpenAfterMs: 60_000,
    },
    concurrency: 1,
    timeout: 12_000,
    fallbackSourceId: "arxiv",
  },

  pubmed: {
    id: "pubmed",
    baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
    rateLimit: { requestsPerWindow: 3, windowMs: 1000, burstAllowance: 0 },
    cache: {
      ttlMs: 1_800_000,
      staleWhileRevalidate: false,
      maxEntries: 150,
      tags: ["research", "medical"],
    },
    retry: {
      maxAttempts: 2,
      baseDelayMs: 1500,
      maxDelayMs: 6000,
      jitterFactor: 0.2,
      retryOn: [429, 500, 503],
    },
    circuitBreaker: {
      failureThreshold: 6,
      successThreshold: 3,
      halfOpenAfterMs: 45_000,
    },
    concurrency: 3,
    timeout: 8_000,
  },

  rss: {
    id: "rss",
    baseUrl: "",
    rateLimit: { requestsPerWindow: 10, windowMs: 1000, burstAllowance: 5 },
    cache: {
      ttlMs: 300_000,
      staleWhileRevalidate: true,
      maxEntries: 100,
      tags: ["news", "rss"],
    },
    retry: {
      maxAttempts: 2,
      baseDelayMs: 500,
      maxDelayMs: 3000,
      jitterFactor: 0.3,
      retryOn: [500, 502, 503],
    },
    circuitBreaker: {
      failureThreshold: 8,
      successThreshold: 2,
      halfOpenAfterMs: 20_000,
    },
    concurrency: 5,
    timeout: 6_000,
  },

  newsapi: {
    id: "newsapi",
    baseUrl: "https://newsapi.org/v2",
    rateLimit: { requestsPerWindow: 1, windowMs: 3_600_000, burstAllowance: 0 },
    cache: {
      ttlMs: 3_600_000,
      staleWhileRevalidate: true,
      maxEntries: 50,
      tags: ["news"],
    },
    retry: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      jitterFactor: 0,
      retryOn: [500],
    },
    circuitBreaker: {
      failureThreshold: 3,
      successThreshold: 1,
      halfOpenAfterMs: 300_000,
    },
    concurrency: 1,
    timeout: 8_000,
  },
};

export class ApiSourceRegistry {
  get(sourceId: string): ApiSourceConfig {
    const config = SOURCES[sourceId];
    if (!config) {
      throw new Error(`Unknown API source: ${sourceId}`);
    }
    return config;
  }

  getAll(): Record<string, ApiSourceConfig> {
    return { ...SOURCES };
  }

  getFallbackChain(primaryId: string): string[] {
    const chain: string[] = [primaryId];
    let current = primaryId;
    const seen = new Set<string>([primaryId]);
    while (true) {
      const cfg = SOURCES[current];
      const next = cfg?.fallbackSourceId;
      if (!next || seen.has(next)) break;
      chain.push(next);
      seen.add(next);
      current = next;
    }
    return chain;
  }
}
