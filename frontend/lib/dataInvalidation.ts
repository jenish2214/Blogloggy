/**
 * Invalidate client caches when trading data changes (orders, wallet, auth).
 */

import { invalidateClientCacheByPrefix, clearClientCache } from "@/lib/clientFetchCache";
import { invalidatePortfolioSnapshotCache } from "@/lib/trading/portfolioSnapshotCache";

/** Portfolio, wealth, dashboard, wallet, suggestions, orders, profile */
export function invalidateTradingData() {
  invalidatePortfolioSnapshotCache();
  const prefixes = [
    "GET:/api/portfolio",
    "GET:/api/wealth",
    "GET:/api/dashboard",
    "GET:/api/wallet",
    "GET:/api/suggestions",
    "GET:/api/orders",
    "GET:/api/user/profile",
    "GET:/api/watchlist",
    "algo:history:",
  ];
  for (const p of prefixes) invalidateClientCacheByPrefix(p);
}

/** Sign-out / user switch — drop all cached GETs */
export function invalidateAllAppData() {
  invalidateTradingData();
  clearClientCache();
}
