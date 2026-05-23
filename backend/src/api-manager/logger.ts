import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

export function logApiSuccess(payload: {
  sourceId: string;
  endpoint: string;
  latencyMs: number;
  cacheHit: boolean;
  attempt: number;
  fallback: boolean;
  budgetLeft?: number;
}): void {
  logger.info({
    msg: "api_call_success",
    ...payload,
  });
}

export function logCircuitOpened(payload: {
  sourceId: string;
  failureCount: number;
  openedAt: string;
  halfOpenAt: string;
}): void {
  logger.warn({
    msg: "circuit_breaker_opened",
    ...payload,
  });
}
