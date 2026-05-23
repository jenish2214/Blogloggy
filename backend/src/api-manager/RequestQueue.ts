import PQueue from "p-queue";
import type { QueueStats } from "./types.js";

export class RequestQueue {
  private queues = new Map<string, PQueue>();
  private stats = new Map<
    string,
    { pending: number; inFlight: number; completed: number; failed: number }
  >();
  private paused = new Set<string>();

  private getStats(sourceId: string) {
    if (!this.stats.has(sourceId)) {
      this.stats.set(sourceId, {
        pending: 0,
        inFlight: 0,
        completed: 0,
        failed: 0,
      });
    }
    return this.stats.get(sourceId)!;
  }

  private getQueue(sourceId: string, concurrency: number): PQueue {
    if (!this.queues.has(sourceId)) {
      this.queues.set(
        sourceId,
        new PQueue({ concurrency, carryoverConcurrencyCount: true })
      );
    }
    return this.queues.get(sourceId)!;
  }

  async enqueue<T>(
    sourceId: string,
    concurrency: number,
    priority: "high" | "normal" | "low",
    fn: () => Promise<T>
  ): Promise<T> {
    if (this.paused.has(sourceId)) {
      throw new Error(`Queue paused for ${sourceId}`);
    }

    const queue = this.getQueue(sourceId, concurrency);
    const s = this.getStats(sourceId);
    s.pending++;

    const run = async (): Promise<T> => {
      s.pending = Math.max(0, s.pending - 1);
      s.inFlight++;
      try {
        const result = await fn();
        s.completed++;
        return result;
      } catch (e) {
        s.failed++;
        throw e;
      } finally {
        s.inFlight = Math.max(0, s.inFlight - 1);
      }
    };

    const opts =
      priority === "high"
        ? { priority: 10 }
        : priority === "low"
          ? { priority: -10 }
          : {};

    return queue.add(run, opts) as Promise<T>;
  }

  getQueueStats(sourceId: string): QueueStats {
    const s = this.getStats(sourceId);
    const q = this.queues.get(sourceId);
    return {
      pending: q?.size ?? s.pending,
      inFlight: s.inFlight,
      completed: s.completed,
      failed: s.failed,
    };
  }

  pause(sourceId: string): void {
    this.paused.add(sourceId);
    this.queues.get(sourceId)?.pause();
  }

  resume(sourceId: string): void {
    this.paused.delete(sourceId);
    this.queues.get(sourceId)?.start();
  }
}
