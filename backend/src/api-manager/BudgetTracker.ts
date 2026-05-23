import type { BudgetStatus } from "./types.js";
import { logger } from "./logger.js";

export const FREE_TIER_LIMITS: Record<
  string,
  { daily: number; hourly: number }
> = {
  newsapi: { daily: 100, hourly: 20 },
  "semantic-scholar": { daily: 1000, hourly: 200 },
  arxiv: { daily: 2000, hourly: 500 },
  pubmed: { daily: 9999, hourly: 500 },
  rss: { daily: 9999, hourly: 999 },
};

interface UsageBucket {
  daily: number;
  hourly: number;
  dailyReset: number;
  hourlyReset: number;
}

export class BudgetTracker {
  private usage = new Map<string, UsageBucket>();

  private getBucket(sourceId: string): UsageBucket {
    if (!this.usage.has(sourceId)) {
      const now = Date.now();
      this.usage.set(sourceId, {
        daily: 0,
        hourly: 0,
        dailyReset: now + 86_400_000,
        hourlyReset: now + 3_600_000,
      });
    }
    return this.usage.get(sourceId)!;
  }

  private resetIfNeeded(bucket: UsageBucket): void {
    const now = Date.now();
    if (now >= bucket.dailyReset) {
      bucket.daily = 0;
      bucket.dailyReset = now + 86_400_000;
    }
    if (now >= bucket.hourlyReset) {
      bucket.hourly = 0;
      bucket.hourlyReset = now + 3_600_000;
    }
  }

  checkBudget(sourceId: string): BudgetStatus {
    const limits = FREE_TIER_LIMITS[sourceId] ?? { daily: 9999, hourly: 999 };
    const bucket = this.getBucket(sourceId);
    this.resetIfNeeded(bucket);

    const dailyRemaining = Math.max(0, limits.daily - bucket.daily);
    const hourlyRemaining = Math.max(0, limits.hourly - bucket.hourly);
    const remaining = Math.min(dailyRemaining, hourlyRemaining);

    let warningLevel: BudgetStatus["warningLevel"] = "ok";
    const dailyPct = dailyRemaining / limits.daily;
    const hourlyPct = hourlyRemaining / limits.hourly;
    const pct = Math.min(dailyPct, hourlyPct);
    if (pct < 0.05) warningLevel = "critical";
    else if (pct < 0.2) warningLevel = "low";

    return {
      available: warningLevel !== "critical",
      remaining,
      resetsAt: new Date(Math.min(bucket.dailyReset, bucket.hourlyReset)),
      warningLevel,
    };
  }

  consume(sourceId: string, count = 1): void {
    const bucket = this.getBucket(sourceId);
    this.resetIfNeeded(bucket);
    bucket.daily += count;
    bucket.hourly += count;
  }

  getBudgetReport(): Record<string, BudgetStatus> {
    const report: Record<string, BudgetStatus> = {};
    for (const sourceId of Object.keys(FREE_TIER_LIMITS)) {
      report[sourceId] = this.checkBudget(sourceId);
    }
    return report;
  }

  logReport(): void {
    logger.info({
      msg: "budget_report",
      budgets: this.getBudgetReport(),
    });
  }

  resetDaily(): void {
    for (const bucket of this.usage.values()) {
      bucket.daily = 0;
      bucket.dailyReset = Date.now() + 86_400_000;
    }
    logger.info({ msg: "budget_daily_reset" });
  }
}
