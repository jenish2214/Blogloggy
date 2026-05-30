"use client";

import { invalidateAllAppData } from "@/lib/dataInvalidation";
import { useActiveBookStore } from "@/lib/store/activeBook";
import { usePortfolioStore } from "@/lib/store/portfolio";

let cachedUserId: string | null = null;

/** Clear local trading cache so another user or book does not see stale data. */
export function resetLocalTradingSession() {
  usePortfolioStore.getState().resetPortfolio();
}

/**
 * On sign-in / sign-out / user switch, drop persisted portfolio state
 * before cloud sync loads the correct user's book.
 */
export function handleAuthSessionChange(userId: string | null) {
  if (userId === cachedUserId) return;
  cachedUserId = userId;
  invalidateAllAppData();
  resetLocalTradingSession();
  if (!userId) {
    useActiveBookStore.getState().clearActiveBook();
  }
}

export function getCachedAuthUserId() {
  return cachedUserId;
}
