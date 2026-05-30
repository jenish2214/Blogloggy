import { getCachedAuthUserId } from "@/lib/auth/tradingSession";
import { useActiveBookStore } from "@/lib/store/activeBook";
import {
  loadPortfolioSnapshot,
  type PortfolioSnapshot,
} from "@/lib/trading/portfolioSnapshot";

const TTL_MS = 30_000;

let entry: { key: string; data: PortfolioSnapshot; expiresAt: number } | null = null;

function snapshotCacheKey(): string {
  const userId = getCachedAuthUserId() ?? "guest";
  const book = useActiveBookStore.getState().activeBook;
  return `${userId}:${book?.portfolioId ?? "default"}:${book?.clientId ?? ""}`;
}

export function getPortfolioSnapshotCache(): PortfolioSnapshot | null {
  if (!entry || entry.expiresAt < Date.now()) return null;
  if (entry.key !== snapshotCacheKey()) return null;
  return entry.data;
}

export async function loadPortfolioSnapshotCached(
  force = false
): Promise<PortfolioSnapshot> {
  if (!force) {
    const hit = getPortfolioSnapshotCache();
    if (hit) return hit;
  }
  const data = await loadPortfolioSnapshot();
  entry = { key: snapshotCacheKey(), data, expiresAt: Date.now() + TTL_MS };
  return data;
}

export function invalidatePortfolioSnapshotCache() {
  entry = null;
}
