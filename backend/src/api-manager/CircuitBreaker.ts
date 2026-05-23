import type { CircuitBreakerConfig, CircuitState } from "./types.js";
import { logCircuitOpened, logger } from "./logger.js";

export class CircuitBreaker {
  private state: CircuitState["state"] = "CLOSED";
  private failures = 0;
  private successes = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly sourceId: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  private tryHalfOpen(): void {
    if (this.state !== "OPEN" || this.openedAt === null) return;
    if (Date.now() - this.openedAt >= this.config.halfOpenAfterMs) {
      this.state = "HALF-OPEN";
      this.successes = 0;
      logger.info({
        msg: "circuit_breaker_half_open",
        sourceId: this.sourceId,
      });
    }
  }

  isAvailable(): boolean {
    if (this.state === "CLOSED") return true;
    if (this.state === "HALF-OPEN") return true;
    this.tryHalfOpen();
    return this.state !== "OPEN";
  }

  recordSuccess(): void {
    if (this.state === "HALF-OPEN") {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.failures = 0;
        this.openedAt = null;
        logger.info({
          msg: "circuit_breaker_closed",
          sourceId: this.sourceId,
        });
      }
      return;
    }
    this.failures = 0;
  }

  recordFailure(): void {
    if (this.state === "HALF-OPEN") {
      this.state = "OPEN";
      this.openedAt = Date.now();
      this.failures = this.config.failureThreshold;
      return;
    }

    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();
      const halfOpenAt = new Date(
        this.openedAt + this.config.halfOpenAfterMs
      ).toISOString();
      logCircuitOpened({
        sourceId: this.sourceId,
        failureCount: this.failures,
        openedAt: new Date(this.openedAt).toISOString(),
        halfOpenAt,
      });
    }
  }

  getState(): CircuitState {
    this.tryHalfOpen();
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      openedAt: this.openedAt,
      halfOpenAt:
        this.openedAt !== null
          ? this.openedAt + this.config.halfOpenAfterMs
          : null,
    };
  }
}
