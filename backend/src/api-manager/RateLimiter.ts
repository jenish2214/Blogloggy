import type { BucketStatus, RateLimitConfig } from "./types.js";
import { logger } from "./logger.js";

class TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefill: number;
  burstTokens: number;
  requestsThisWindow = 0;
  windowStart = Date.now();

  constructor(config: RateLimitConfig) {
    this.capacity = config.requestsPerWindow + config.burstAllowance;
    this.tokens = this.capacity;
    this.burstTokens = config.burstAllowance;
    this.refillRate = config.requestsPerWindow / config.windowMs;
    this.lastRefill = Date.now();
  }

  refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    const added = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + added);
    this.lastRefill = now;

    if (now - this.windowStart >= 1000) {
      this.requestsThisWindow = 0;
      this.windowStart = now;
    }
  }

  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.requestsThisWindow++;
      return true;
    }
    return false;
  }

  waitTimeMs(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const needed = 1 - this.tokens;
    return Math.ceil(needed / this.refillRate);
  }
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();

  private getBucket(sourceId: string, config: RateLimitConfig): TokenBucket {
    if (!this.buckets.has(sourceId)) {
      this.buckets.set(sourceId, new TokenBucket(config));
    }
    return this.buckets.get(sourceId)!;
  }

  async waitForToken(sourceId: string, config: RateLimitConfig): Promise<void> {
    const bucket = this.getBucket(sourceId, config);
    if (bucket.consume()) return;

    const waitMs = bucket.waitTimeMs();
    if (waitMs > 2000) {
      logger.warn({
        msg: "rate_limit_wait",
        sourceId,
        waitMs,
      });
    }
    await new Promise((r) => setTimeout(r, waitMs));
    bucket.consume();
  }

  getStatus(sourceId: string, config: RateLimitConfig): BucketStatus {
    const bucket = this.getBucket(sourceId, config);
    bucket.refill();
    return {
      tokens: Math.floor(bucket.tokens),
      capacity: bucket.capacity,
      nextRefillMs: bucket.waitTimeMs(),
      requestsThisWindow: bucket.requestsThisWindow,
    };
  }
}
