import type { AxiosError } from "axios";
import type { RetryConfig } from "./types.js";
import { RetryExhaustedError } from "./types.js";
import { logger } from "./logger.js";

export class RetryEngine {
  constructor(private readonly config: RetryConfig) {}

  calculateDelay(attempt: number): number {
    const exponential = this.config.baseDelayMs * Math.pow(2, attempt);
    const capped = Math.min(exponential, this.config.maxDelayMs);
    const jitter =
      capped * (1 + Math.random() * this.config.jitterFactor);
    return Math.round(jitter);
  }

  shouldRetry(error: unknown): boolean {
    const ax = error as AxiosError;
    if (ax.code === "ECONNRESET" || ax.code === "ETIMEDOUT" || ax.code === "ENOTFOUND") {
      return true;
    }
    const status = ax.response?.status;
    if (status && this.config.retryOn.includes(status)) return true;
    return false;
  }

  async execute<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: unknown;
    const max = Math.max(1, this.config.maxAttempts);

    for (let attempt = 0; attempt < max; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const isLast = attempt === max - 1;
        if (isLast || !this.shouldRetry(err)) {
          break;
        }
        const delay = this.calculateDelay(attempt);
        logger.warn({
          msg: "api_retry",
          context,
          attempt: attempt + 1,
          maxAttempts: max,
          delayMs: delay,
          status: (err as AxiosError).response?.status,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw new RetryExhaustedError(
      `Retry exhausted for ${context}`,
      max,
      lastError
    );
  }
}
